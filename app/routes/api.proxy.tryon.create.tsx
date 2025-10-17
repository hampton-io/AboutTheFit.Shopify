import type { ActionFunctionArgs } from 'react-router';
import { virtualTryOnAI } from '../services/ai.server';

/**
 * App Proxy endpoint for customer try-on requests
 * Accessible via: /apps/aboutthefit/api/tryon/create from the storefront
 * Routes to: /api/proxy/tryon/create in the app
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  console.log('🎨 App Proxy Try-On API hit!', request.method);

  if (request.method !== 'POST') {
    return Response.json(
      { success: false, error: 'Method not allowed' },
      { status: 405 }
    );
  }

  try {
    const body = await request.json();
    const { productId, productTitle, productImage, userPhoto } = body;

    console.log('📦 Product:', productTitle);
    console.log('📸 User photo received:', userPhoto ? 'Yes' : 'No');

    if (!productId || !productTitle || !productImage || !userPhoto) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('🤖 Calling AI service...');

    // Generate try-on using AI
    const aiResult = await virtualTryOnAI.generateTryOn({
      userPhoto: userPhoto,
      clothingImage: productImage,
      clothingName: productTitle,
    });

    console.log('✅ AI result:', aiResult.success ? 'Success!' : 'Failed');

    if (!aiResult.success || !aiResult.resultImage) {
      return Response.json(
        {
          success: false,
          error: aiResult.error || 'Failed to generate try-on',
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      resultImage: aiResult.resultImage,
      analysisText: aiResult.analysisText,
    });
  } catch (error) {
    console.error('❌ Error in try-on creation:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
};

// Support GET for testing
export const loader = async () => {
  return Response.json({
    message: 'Try-On API endpoint via App Proxy',
    status: 'online',
    note: 'Use POST to create a try-on request',
  });
};

