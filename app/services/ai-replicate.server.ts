import Replicate from 'replicate';

/**
 * Virtual Try-On using Replicate's specialized models
 * 
 * Setup:
 * 1. Sign up at https://replicate.com
 * 2. Get your API token from https://replicate.com/account/api-tokens
 * 3. Add REPLICATE_API_TOKEN to your .env file
 * 
 * This uses IDM-VTON, a state-of-the-art virtual try-on model
 */

const apiToken = process.env.REPLICATE_API_TOKEN || '';

if (!apiToken) {
  console.warn('⚠️  REPLICATE_API_TOKEN is not set. Virtual try-on will not work.');
}

const replicate = new Replicate({
  auth: apiToken,
});

export interface TryOnRequest {
  userPhoto: string; // base64 or URL
  clothingImage: string; // base64 or URL
  clothingName: string;
}

export interface TryOnResponse {
  success: boolean;
  resultImage?: string;
  error?: string;
  analysisText?: string;
  code?: 'NO_IMAGE' | 'TEXT_ONLY' | 'GENERATION_ERROR' | 'INVALID_INPUT';
}

export class VirtualTryOnAI {
  async generateTryOn(request: TryOnRequest): Promise<TryOnResponse> {
    try {
      console.log('🎨 Generating virtual try-on with Replicate IDM-VTON...');

      // IDM-VTON model - specialized for virtual try-on
      const output = await replicate.run(
        "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
        {
          input: {
            garm_img: request.clothingImage,
            human_img: request.userPhoto,
            garment_des: request.clothingName || "clothing item",
            category: "upper_body", // or "lower_body", "dresses"
            // Optional parameters for quality
            denoise_steps: 30,
            guidance_scale: 2.0,
          }
        }
      );

      console.log('✅ Replicate generation complete');

      // Replicate returns a URL or array of URLs
      if (typeof output === 'string') {
        // Convert URL to base64 for consistency
        const base64Image = await this.urlToBase64(output);
        return {
          success: true,
          resultImage: base64Image,
        };
      } else if (Array.isArray(output) && output.length > 0) {
        const base64Image = await this.urlToBase64(output[0]);
        return {
          success: true,
          resultImage: base64Image,
        };
      }

      return {
        success: false,
        error: 'No image generated',
        code: 'NO_IMAGE',
      };
    } catch (error) {
      console.error('❌ Error generating try-on:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        error: `Virtual try-on failed: ${errorMessage}`,
        code: 'GENERATION_ERROR',
      };
    }
  }

  private async urlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const base64String = Buffer.from(arrayBuffer).toString('base64');
      return `data:image/jpeg;base64,${base64String}`;
    } catch (error) {
      console.error('Error converting URL to base64:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const virtualTryOnAI = new VirtualTryOnAI();

