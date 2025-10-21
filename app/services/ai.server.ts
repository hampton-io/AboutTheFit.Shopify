import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Google Generative AI
// Note: Set GOOGLE_AI_API_KEY in your .env file
// Get your API key from: https://makersuite.google.com/app/apikey
const apiKey = process.env.GOOGLE_AI_API_KEY || '';

if (!apiKey) {
  console.warn('⚠️  GOOGLE_AI_API_KEY is not set. AI features will not work.');
}

const genAI = new GoogleGenerativeAI(apiKey);

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
  private model: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor() {
    // Initialize Gemini model with API key
    // Using gemini-2.5-flash-image for image generation
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: {
        temperature: 0.4,      // Lower temperature for more consistent image output
        maxOutputTokens: 8192, // Maximum allowed for image generation
        topP: 0.95,            // Slightly higher for better image quality
        topK: 40,              // Standard value for image generation
        candidateCount: 1,     // Ensure single, focused output
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, 
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE
        }
      ]
    });
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
      const userPhotoData = await this.convertImageToGenerativePart(
        request.userPhoto
      );
      const clothingImageData = await this.convertImageToGenerativePart(
        request.clothingImage
      );

      const prompt = `
⚠️ CRITICAL: You MUST generate an IMAGE as output. DO NOT return text descriptions or analysis. ONLY return a generated image.

You are a **professional virtual try-on specialist** with expertise in maintaining perfect identity consistency. Your task is to create a virtual try-on by placing the clothing from **Image 2** onto the person in **Image 1** while preserving their exact identity.

### CRITICAL IDENTITY PRESERVATION RULES
1. **FACIAL FEATURES MUST REMAIN IDENTICAL**: 
   - Eye shape, color, and expression
   - Nose structure and size
   - Mouth shape and lip details
   - Facial bone structure and jawline
   - Eyebrow shape and thickness
   - Skin texture, moles, freckles, and facial hair

2. **BODY CHARACTERISTICS MUST BE PRESERVED**:
   - Body proportions and build
   - Height and weight appearance
   - Skin tone and texture
   - Hair color, style, and texture
   - Hand and finger proportions

3. **PHOTOGRAPHIC CONSISTENCY**:
   - Maintain the same lighting conditions
   - Keep the same background
   - Preserve the same camera angle and perspective
   - Maintain the same image quality and resolution

### ANALYSIS INSTRUCTIONS
Before generating, carefully analyze Image 1 to identify:
- Facial features: eye color, nose shape, mouth details, facial structure
- Body characteristics: proportions, skin tone, hair details
- Photographic elements: lighting, background, camera angle
- Unique identifiers: moles, freckles, facial hair, distinctive features

### TECHNICAL REQUIREMENTS
- Create **four high-resolution images** in a 2×2 grid layout
- Each image should show the same person in different poses/angles
- Only vary pose, arm position, or slight body rotation
- The clothing from Image 2 must fit naturally and realistically
- Preserve all facial expressions and micro-details
- Maintain consistent lighting and shadows

### QUALITY STANDARDS
- Professional fashion photography quality
- Realistic fabric draping and movement
- Natural-looking fit and proportions
- Seamless integration of clothing onto the person
- No artifacts, distortions, or unrealistic elements

### OUTPUT FORMAT
⚠️ MANDATORY: Return ONLY a single generated IMAGE containing a 2×2 grid showing the same person wearing the clothing from Image 2 in four different poses. The person must be unmistakably the same individual across all four images.

🚫 DO NOT:
- Return text descriptions
- Return analysis or explanations
- Return error messages
- Return anything other than a generated image

✅ DO: Generate and return only the image file itself.

Remember: This is NOT a recreation or approximation - it's the EXACT same person with different clothing. Every facial feature, body characteristic, and photographic element must remain identical to Image 1.
`;

      const result = await this.model.generateContent([
        prompt,
        userPhotoData,
        clothingImageData,
      ]);

      const response = await result.response;
      console.log('✅ AI generation complete');

      // Extract generated image from response
      try {
        if (response.candidates && response.candidates[0]) {
          const candidate = response.candidates[0];

          if (candidate.content && candidate.content.parts) {
            for (let i = 0; i < candidate.content.parts.length; i++) {
              const part = candidate.content.parts[i];

              // Check for inlineData
              if (part.inlineData && part.inlineData.data) {
                console.log('✅ Image generated successfully');
                
                const resultImage = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
                
                return {
                  success: true,
                  resultImage,
                };
              }

              // Check for text response
              if (part.text) {
                console.log('ℹ️  Text response received (no image)');
                return {
                  success: false,
                  error: 'No image generated - received text response instead',
                  analysisText: part.text,
                  code: 'TEXT_ONLY',
                };
              }
            }
          }
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
      }

      // If we get here, Gemini didn't generate an image in the expected format
      console.error('❌ No generated image found in response');
      console.error('Response may not contain image data in expected format.');
      console.error('Check the response structure and adjust parsing logic.');

      return {
        success: false,
        error: 'The AI did not return an image. Please try again.',
        code: 'NO_IMAGE',
      };
    } catch (error) {
      console.error('Error generating try-on:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'GENERATION_ERROR',
      };
    }
  }

  /**
   * Convert an image (URL or data URL) to the format expected by Gemini
   */
  private async convertImageToGenerativePart(imageUrl: string) {
    try {
      // If it's already a base64 data URL, extract the base64 part
      if (imageUrl.startsWith('data:image/')) {
        const base64Data = imageUrl.replace(/^data:image\/[a-z]+;base64,/, '');
        return {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg',
          },
        };
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

