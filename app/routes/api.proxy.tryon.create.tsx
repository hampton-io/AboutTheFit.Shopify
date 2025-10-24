import type { ActionFunctionArgs } from 'react-router';
import { virtualTryOnAI } from '../services/ai.server';
import { hasTryOnLimitsExceeded, checkAndResetMonthlyLimits } from '../services/billing.server';
import { incrementCreditsUsed, createTryOnRequest, updateTryOnStatus } from '../services/tryon.server';
import { getCannedImageById, getCachedTryOn, upsertCachedTryOn } from '../services/canned.server';
import { TryOnStatus } from '../db.server';
import { optimizeImagesForTryOn } from '../services/image-optimizer.server';

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
    const { productId, productTitle, productImage, userPhoto, cannedImageId } = body;

    console.log('📦 Product:', productTitle);
    console.log('📸 User photo received:', userPhoto ? 'Yes' : 'No');
    console.log('🎭 Canned image ID:', cannedImageId || 'None');

    if (!productId || !productTitle || !productImage) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate that either userPhoto or cannedImageId is provided
    if (!userPhoto && !cannedImageId) {
      return Response.json(
        { success: false, error: 'Either userPhoto or cannedImageId is required' },
        { status: 400 }
      );
    }

    // If using a canned image, check the cache first
    if (cannedImageId) {
      console.log('🔍 Checking cache for canned image:', cannedImageId);
      
      // Verify the canned image exists
      const cannedImage = await getCannedImageById(cannedImageId);
      if (!cannedImage) {
        return Response.json(
          { success: false, error: 'Invalid canned image ID' },
          { status: 400 }
        );
      }

      // Check if we have a cached result
      const cachedResult = await getCachedTryOn({
        shop,
        cannedImageId,
        productId,
      });

      if (cachedResult) {
        console.log('✅ Cache hit! Returning cached result');
        
        // Still create a try-on request record for analytics
        await createTryOnRequest({
          shop,
          productId,
          productTitle,
          productImage,
          userPhotoUrl: cannedImage.imageUrl,
          metadata: {
            createdVia: 'storefront',
            cached: true,
            cannedImageId,
            timestamp: new Date().toISOString(),
          },
        });

        // Still increment credits for tracking (cached results count towards usage)
        await incrementCreditsUsed(shop);

        return Response.json({
          success: true,
          resultImage: cachedResult.resultImageUrl,
          cached: true,
        });
      }

      console.log('❌ Cache miss. Generating new try-on...');
    }

    // Determine the actual user photo to use
    let actualUserPhoto = userPhoto;
    let actualCannedImage = null;
    
    if (cannedImageId) {
      actualCannedImage = await getCannedImageById(cannedImageId);
      if (actualCannedImage) {
        actualUserPhoto = actualCannedImage.imageUrl;
      }
    }

    // Create try-on request record (PENDING status)
    const tryOnRequest = await createTryOnRequest({
      shop,
      productId,
      productTitle,
      productImage,
      userPhotoUrl: actualUserPhoto || 'data:image/jpeg;base64,...',
      metadata: {
        createdVia: 'storefront',
        cannedImageId: cannedImageId || null,
        timestamp: new Date().toISOString(),
      },
    });

    console.log('📝 Try-on request created:', tryOnRequest.id);
    console.log('🖼️  Optimizing images before AI processing...');

    // Optimize images before sending to AI to reduce token usage and costs
    const optimizedImages = await optimizeImagesForTryOn({
      userPhoto: actualUserPhoto,
      clothingImage: productImage,
    });

    console.log('✅ Images optimized successfully');
    console.log(`💰 Size reduced by ${optimizedImages.stats.totalSavings.toFixed(1)}% - saving tokens and costs!`);
    console.log('🤖 Calling AI service with optimized images...');

    // Generate try-on using AI with optimized images
    const aiResult = await virtualTryOnAI.generateTryOn({
      userPhoto: optimizedImages.userPhoto,
      clothingImage: optimizedImages.clothingImage,
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
      // Use a friendly, generic message to avoid exposing technical details
      return Response.json(
        {
          success: false,
          retryable: true,
          code: aiResult.code || 'GENERATION_ERROR',
          error: 'We couldn\'t create your try-on right now. Please try again.',
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

    // If using a canned image, cache the result for future use
    if (cannedImageId && aiResult.resultImage) {
      console.log('💾 Caching result for canned image:', cannedImageId);
      try {
        await upsertCachedTryOn({
          shop,
          cannedImageId,
          productId,
          productTitle,
          productImage,
          resultImageUrl: aiResult.resultImage,
        });
        console.log('✅ Result cached successfully');
      } catch (error) {
        console.error('❌ Failed to cache result:', error);
        // Don't fail the request if caching fails
      }
    }

    // Increment credits used (only on success)
    await incrementCreditsUsed(shop);
    console.log('💳 Credits incremented for shop:', shop);
    console.log('📊 Stats will update: totalTryOns +1');

    return Response.json({
      success: true,
      resultImage: aiResult.resultImage,
      analysisText: aiResult.analysisText,
      cached: false, // This is a fresh generation
    });
  } catch (error) {
    console.error('❌ Error in try-on creation:', error);
    // Log full error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Full error details:', errorMessage);
    
    return Response.json(
      {
        success: false,
        retryable: true,
        error: 'Something went wrong. Please try again.',
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

