import { GoogleGenerativeAI } from '@google/generative-ai';

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
}

export class VirtualTryOnAI {
  private model: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor() {
    // Initialize Gemini model with API key
    // Using gemini-2.5-flash-image for image generation
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
    });
  }

  async generateTryOn(request: TryOnRequest): Promise<TryOnResponse> {
    try {
      console.log('AI mode: Generating virtual try-on with Gemini...');

      // Convert images to the format expected by Gemini
      const userPhotoData = await this.convertImageToGenerativePart(
        request.userPhoto
      );
      const clothingImageData = await this.convertImageToGenerativePart(
        request.clothingImage
      );

      const prompt = `
You are a **photo compositing and virtual try-on specialist**. Your job is to edit the person from **Image 1** so they appear **wearing the clothing from Image 2** — while remaining unmistakably the *same individual* in every frame.

### Identity Lock (Highest Priority)
- Treat Image 1 as the **master photo** — do not recreate or approximate the person.
- The face, skin tone, body shape, hairstyle, and proportions must be *identical pixel-by-pixel* across all outputs.
- Do not alter facial geometry, lighting direction, or age.
- Every generated view must clearly show the **exact same person** as in Image 1.

### Output Requirements
- Create **four high-resolution edited photos** of this same person wearing the clothing from Image 2.
- Each photo should vary only by **pose, camera angle, or body orientation**, *not by face or identity*.
- Keep identical lighting and background across all four images for continuity.
- Use the **exact clothing** from Image 2 — same color, texture, pattern, and material.
- Clothing must fit naturally and respond to body movement realistically.

### Composition
- Arrange the four edited photos in a 2×2 collage layout.
- It must look like a **professional fashion shoot** featuring one model (the person from Image 1) showing the same outfit in different poses.

### Reminder
The model in all four photos is the **same person from Image 1**, not a variation or recreation.
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
                return {
                  success: true,
                  resultImage: `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`,
                };
              }

              // Check for text response
              if (part.text) {
                console.log('ℹ️  Text response received (no image)');
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
        error: 'No image generated. Please check the API response format.',
      };
    } catch (error) {
      console.error('Error generating try-on:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
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
   */
  async analyzeClothing(clothingImage: string): Promise<string> {
    try {
      const imageData = await this.convertImageToGenerativePart(clothingImage);

      const prompt = `
Analyze this clothing item and provide:
1. Type of clothing (e.g., t-shirt, dress, jeans)
2. Color(s)
3. Pattern/texture
4. Material (if identifiable)
5. Style description
6. Suitable occasions

Keep the response concise and well-formatted.
`;

      const result = await this.model.generateContent([prompt, imageData]);
      const response = await result.response;
      const text = response.text();

      return text;
    } catch (error) {
      console.error('Error analyzing clothing:', error);
      throw new Error('Failed to analyze clothing');
    }
  }

  /**
   * Validate if an uploaded image is suitable for try-on
   */
  async validateUserPhoto(photoUrl: string): Promise<{
    isValid: boolean;
    message?: string;
  }> {
    try {
      const imageData = await this.convertImageToGenerativePart(photoUrl);

      const prompt = `
Analyze this photo and determine if it's suitable for virtual try-on.
Requirements:
- Must contain exactly one person
- Person should be clearly visible
- Front-facing or slightly angled view is best
- Full upper body should be visible
- Good lighting quality

Respond with: VALID or INVALID, followed by a brief reason.
`;

      const result = await this.model.generateContent([prompt, imageData]);
      const response = await result.response;
      const text = response.text();

      const isValid = text.toLowerCase().includes('valid');
      return {
        isValid,
        message: text,
      };
    } catch (error) {
      console.error('Error validating photo:', error);
      return {
        isValid: false,
        message: 'Failed to validate photo',
      };
    }
  }
}

// Export a singleton instance
export const virtualTryOnAI = new VirtualTryOnAI();

