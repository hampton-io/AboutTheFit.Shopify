import { GoogleGenAI, GenerateContentResponse, Modality } from '@google/genai';

// Initialize Google Generative AI
// Note: Set GOOGLE_AI_API_KEY in your .env file
// Get your API key from: https://makersuite.google.com/app/apikey
const apiKey = process.env.GOOGLE_AI_API_KEY || '';

if (!apiKey) {
  console.warn('⚠️  GOOGLE_AI_API_KEY is not set. AI features will not work.');
}

const ai = new GoogleGenAI({ apiKey });
const model = 'gemini-2.5-flash-image';

// Helper functions for image conversion
const dataUrlToParts = (dataUrl: string) => {
  const arr = dataUrl.split(',');
  if (arr.length < 2) throw new Error('Invalid data URL');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch || !mimeMatch[1]) throw new Error('Could not parse MIME type from data URL');
  return { mimeType: mimeMatch[1], data: arr[1] };
};

const dataUrlToPart = (dataUrl: string) => {
  const { mimeType, data } = dataUrlToParts(dataUrl);
  return { inlineData: { mimeType, data } };
};

// Handle API response with better error messages
const handleApiResponse = (response: GenerateContentResponse): string => {
  if (response.promptFeedback?.blockReason) {
    const { blockReason, blockReasonMessage } = response.promptFeedback;
    const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
    throw new Error(errorMessage);
  }

  // Find the first image part in any candidate
  for (const candidate of response.candidates ?? []) {
    const imagePart = candidate.content?.parts?.find(part => part.inlineData);
    if (imagePart?.inlineData) {
      const { mimeType, data } = imagePart.inlineData;
      return `data:${mimeType};base64,${data}`;
    }
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
    throw new Error(errorMessage);
  }

  const textFeedback = response.text?.trim();
  const errorMessage = `The AI model did not return an image. ` + (textFeedback ? `The model responded with text: "${textFeedback}"` : 'This can happen due to safety filters or if the request is too complex. Please try a different image.');
  throw new Error(errorMessage);
};

export interface TryOnRequest {
  userPhoto: string; // base64 or URL
  clothingImage: string; // base64 or URL
  clothingName: string;
}

export interface TryOnResponse {
  success: boolean;
  resultImage?: string;
  error?: string;
  analysisText?: string; // For text-only responses
  code?: 'NO_IMAGE' | 'TEXT_ONLY' | 'GENERATION_ERROR' | 'INVALID_INPUT';
}

export class VirtualTryOnAI {
  constructor() {
    // No initialization needed - using the module-level ai instance
  }

  async generateTryOn(request: TryOnRequest): Promise<TryOnResponse> {
    const maxRetries = 3;
    let lastError: TryOnResponse | null = null;

    // Retry up to maxRetries times if we get text instead of image
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`AI mode: Generating virtual try-on with Gemini (attempt ${attempt}/${maxRetries})...`);
        
        const result = await this.generateTryOnAttempt(request);
        
        // If successful, return immediately
        if (result.success) {
          console.log(`✅ Successfully generated image on attempt ${attempt}`);
          return result;
        }
        
        // If it's a text-only response and we have retries left, try again
        if (result.code === 'TEXT_ONLY' && attempt < maxRetries) {
          console.log(`⚠️  Received text instead of image on attempt ${attempt}. Retrying...`);
          lastError = result;
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        // For other errors or last attempt, return the error
        return result;
      } catch (error) {
        console.error(`Error on attempt ${attempt}:`, error);
        if (attempt === maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            code: 'GENERATION_ERROR',
          };
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    // Should not reach here, but return last error if it does
    return lastError || {
      success: false,
      error: 'Failed to generate image after multiple attempts',
      code: 'GENERATION_ERROR',
    };
  }

  private async generateTryOnAttempt(request: TryOnRequest): Promise<TryOnResponse> {
    try {
      // Convert images to the format expected by Gemini
      const userPhotoData = await this.convertImageToGenerativePart(request.userPhoto);
      const clothingImageData = await this.convertImageToGenerativePart(request.clothingImage);

      const prompt = `You are an expert virtual try-on AI. You will be given a model image and a garment image. Your task is to create a new photorealistic 2x2 grid of four images where the person from the model image is wearing the clothing from the garment image.
Crucial Rules for Each Image in the Grid:
Complete Garment Replacement: You MUST completely REMOVE and REPLACE the clothing item worn by the person in the model image with the new garment. No part of the original clothing (e.g., collars, sleeves, patterns) should be visible.
Preserve the Model's Identity: The person's face, hair, and body shape from the model image MUST remain unchanged across all four images.
Preserve the Background: The entire background from the model image MUST be preserved perfectly in all four images.
Apply the Garment: Realistically fit the new garment onto the person. It should adapt to their pose with natural folds, shadows, and lighting consistent with the original scene.
Introduce Pose Variation: Each of the four images in the grid should feature a subtle, natural variation in the person's pose or angle (e.g., a slight turn of the body, a different arm position).
Final Output Requirement:
⚠️ CRITICAL: Return ONLY a single image file containing the final 2x2 grid.
🚫 Do not include any text, analysis, or descriptions. Your sole output must be the generated image.`;

      // Use the new API structure with optimized config for image generation
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [userPhotoData, clothingImageData, { text: prompt }]
        },
        config: {
          // Specify we want image output (with text as fallback for error messages)
          responseModalities: [Modality.IMAGE, Modality.TEXT],
          
          // Low temperature (0.2) for consistent, predictable image generation
          // Virtual try-on requires reliability over creativity
          temperature: 0.2,
          
          // High topP (0.95) preserves image quality and detail
          // Allows the model to consider high-probability tokens for photorealism
          topP: 0.95,
          
          // Higher topK (64) for image generation allows more token diversity
          // Essential for generating varied poses while maintaining quality
          topK: 64,
          
          // Only generate 1 candidate to optimize cost and latency
          candidateCount: 1,
          
          // Maximum tokens for image generation (8192 is the limit for Gemini 2.5 Flash Image)
          // Higher token count = higher quality images with more detail
          maxOutputTokens: 8192,
          
          // Presence/frequency penalties are primarily for text generation
          // Set to 0 as they don't significantly impact image generation
          presencePenalty: 0.0,
          frequencyPenalty: 0.0,
        },
      });

      console.log('✅ AI generation complete');

      // Use the improved error handling
      const resultImage = handleApiResponse(response);
                
                return {
                  success: true,
                  resultImage,
      };
    } catch (error) {
      console.error('Error generating try-on:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Full error details:', errorMessage);
      
      // Check if it's a text-only response for retry logic
      if (errorMessage.includes('did not return an image')) {
        return {
          success: false,
          error: errorMessage,
          code: 'TEXT_ONLY',
        };
      }
      
      return {
        success: false,
        error: 'We couldn\'t generate your try-on right now. Please try again.',
        code: 'GENERATION_ERROR',
      };
    }
  }

  /**
   * Convert an image (URL or data URL) to the format expected by Gemini
   */
  private async convertImageToGenerativePart(imageUrl: string) {
    try {
      // If it's already a base64 data URL, use the helper function
      if (imageUrl.startsWith('data:image/')) {
        return dataUrlToPart(imageUrl);
      }

      // Fix protocol-relative URLs (//domain.com/path -> https://domain.com/path)
      let fullUrl = imageUrl;
      if (imageUrl.startsWith('//')) {
        fullUrl = 'https:' + imageUrl;
      }

      // If it's a URL, fetch the image and convert to base64
      const response = await fetch(fullUrl);
      const arrayBuffer = await response.arrayBuffer();
      const base64String = Buffer.from(arrayBuffer).toString('base64');

      return {
        inlineData: {
          data: base64String,
          mimeType: 'image/jpeg',
        },
      };
    } catch (error) {
      console.error('Error converting image:', error);
      throw new Error('Failed to convert image to base64');
    }
  }

  /**
   * Analyze clothing from an image (this works with Gemini)
//    */
//   async analyzeClothing(clothingImage: string): Promise<string> {
//     try {
//       const imageData = await this.convertImageToGenerativePart(clothingImage);

//       const prompt = `
// Analyze this clothing item and provide:
// 1. Type of clothing (e.g., t-shirt, dress, jeans)
// 2. Color(s)
// 3. Pattern/texture
// 4. Material (if identifiable)
// 5. Style description
// 6. Suitable occasions

// Keep the response concise and well-formatted.
// `;

//       const result = await this.model.generateContent([prompt, imageData]);
//       const response = await result.response;
//       const text = response.text();

//       return text;
//     } catch (error) {
//       console.error('Error analyzing clothing:', error);
//       throw new Error('Failed to analyze clothing');
//     }
//   }


  // (Removed) validateGeneratedImage and validateUserPhoto utilities to reduce latency and cost
}

// Export a singleton instance
export const virtualTryOnAI = new VirtualTryOnAI();

