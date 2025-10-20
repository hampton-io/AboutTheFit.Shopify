import type { ActionFunctionArgs } from 'react-router';
import { virtualTryOnAI } from '../services/ai.server';
import { hasTryOnLimitsExceeded, checkAndResetMonthlyLimits } from '../services/billing.server';
import { incrementCreditsUsed, createTryOnRequest, updateTryOnStatus } from '../services/tryon.server';
import { TryOnStatus } from '../db.server';

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
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');
    
    if (!shop) {
      return Response.json(
        { success: false, error: 'Shop parameter is required' },
        { status: 400 }
      );
    }

    // Check and reset monthly limits if needed
    await checkAndResetMonthlyLimits(shop);

    // Check if shop has exceeded try-on limits
    const limitsExceeded = await hasTryOnLimitsExceeded(shop);
    if (limitsExceeded) {
      console.log('❌ Try-on limits exceeded for shop:', shop);
      return Response.json(
        { 
          success: false, 
          error: 'You have reached your monthly try-on limit. Please upgrade your plan to continue.' 
        },
        { status: 403 }
      );
    }

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

    // Create try-on request record (PENDING status)
    const tryOnRequest = await createTryOnRequest({
      shop,
      productId,
      productTitle,
      productImage,
      userPhotoUrl: 'data:image/jpeg;base64,...', // User photo stored locally
      metadata: {
        createdVia: 'storefront',
        timestamp: new Date().toISOString(),
      },
    });

    console.log('📝 Try-on request created:', tryOnRequest.id);
    console.log('🤖 Calling AI service...');

    // Generate try-on using AI
    const aiResult = await virtualTryOnAI.generateTryOn({
      userPhoto: userPhoto,
      clothingImage: productImage,
      clothingName: productTitle,
    });

    console.log('✅ AI result:', aiResult.success ? 'Success!' : 'Failed');

    if (!aiResult.success || !aiResult.resultImage) {
      // Update request to FAILED status (do NOT increment credits on failure)
      await updateTryOnStatus(tryOnRequest.id, TryOnStatus.FAILED, {
        errorMessage: aiResult.error || 'Failed to generate try-on',
        metadata: {
          ...(tryOnRequest.metadata as Record<string, any>),
          failedAt: new Date().toISOString(),
          aiCode: aiResult.code || 'GENERATION_ERROR',
        },
      });

      console.log('❌ Try-on failed without image; credits not charged');

      // Return 200 with retryable signal for storefront UX to handle gracefully
      return Response.json(
        {
          success: false,
          retryable: true,
          code: aiResult.code || 'GENERATION_ERROR',
          error:
            aiResult.error ||
            'Our AI did not return an image this time. Please try again.',
          analysisText: aiResult.analysisText || null,
        },
        { status: 200 }
      );
    }

    // Update request to COMPLETED status
    await updateTryOnStatus(tryOnRequest.id, TryOnStatus.COMPLETED, {
      resultImageUrl: 'stored-locally', // Result is sent directly to customer
      metadata: {
        ...tryOnRequest.metadata as Record<string, any>,
        completedAt: new Date().toISOString(),
        hasAnalysis: !!aiResult.analysisText,
      },
    });

    // Increment credits used (only on success)
    await incrementCreditsUsed(shop);
    console.log('💳 Credits incremented for shop:', shop);
    console.log('📊 Stats will update: totalTryOns +1');

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

