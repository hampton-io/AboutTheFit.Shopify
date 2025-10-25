import type { ActionFunctionArgs } from 'react-router';
import { virtualTryOnAI } from '../services/ai.server';
import { hasTryOnLimitsExceeded, checkAndResetMonthlyLimits } from '../services/billing.server';
import { incrementCreditsUsed, createTryOnRequest, updateTryOnStatus } from '../services/tryon.server';
import { getCannedImageById, getCachedTryOn, upsertCachedTryOn } from '../services/canned.server';
import { TryOnStatus } from '../db.server';
import { optimizeImage } from '../services/image-optimizer.server';

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

    // Detect if userPhoto is a data URL (user upload) vs HTTP URL
    const isUserUpload = userPhoto && userPhoto.startsWith('data:');
    if (isUserUpload) {
      console.log('✅ Detected user-uploaded photo (data URL) - cache will NOT be used');
    }

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

    // CRITICAL: Cache is ONLY used for canned images, NOT for user-uploaded photos
    // If user provides their own photo, we skip cache even if cannedImageId is somehow present
    const useCannedImage = !userPhoto && cannedImageId;
    
    // SAFETY CHECK: If both are provided, that's a bug in the frontend
    if (userPhoto && cannedImageId) {
      console.warn('⚠️  WARNING: Both userPhoto and cannedImageId received! Using userPhoto (no cache).');
      console.warn('⚠️  This indicates a frontend bug - these should be mutually exclusive.');
    }

    // If using a canned image (and no user photo), check the cache first
    if (useCannedImage) {
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
    } else if (userPhoto) {
      console.log('📸 Using user-uploaded photo (cache not applicable)');
    }

    // Determine the actual user photo to use
    let actualUserPhoto = userPhoto;
    let actualCannedImage = null;
    
    // Only use canned image if no user photo was provided
    if (!userPhoto && cannedImageId) {
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
        cannedImageId: userPhoto ? null : (cannedImageId || null), // Only set if using canned image
        isUserUploaded: !!userPhoto,
        timestamp: new Date().toISOString(),
      },
    });

    console.log('📝 Try-on request created:', tryOnRequest.id);
    
    // Check if image optimization is enabled (can be disabled via env var)
    const enableOptimization = process.env.ENABLE_IMAGE_OPTIMIZATION !== 'false';
    
    let finalUserPhoto = actualUserPhoto;
    
    if (enableOptimization) {
      try {
        console.log('🖼️  Optimizing user photo before AI processing...');
        
        // Optimize user photo before sending to AI to reduce token usage and costs
        // Note: Product images from Shopify are already optimized, so we skip those
        // Using higher quality settings (95%) to ensure AI compatibility
        const optimizedUserPhoto = await optimizeImage(actualUserPhoto, {
          maxWidth: 1536,  // Increased from 1024 for better AI processing
          maxHeight: 1536, // Increased from 1024 for better AI processing
          quality: 95,     // Increased from 85 for better quality
        });

        console.log('✅ User photo optimized successfully');
        console.log(`💰 User photo size reduced by ${optimizedUserPhoto.compressionRatio.toFixed(1)}% - saving tokens!`);
        
        finalUserPhoto = optimizedUserPhoto.data;
      } catch (error) {
        console.error('⚠️  Image optimization failed, using original image:', error);
        finalUserPhoto = actualUserPhoto;
      }
    } else {
      console.log('ℹ️  Image optimization disabled (ENABLE_IMAGE_OPTIMIZATION=false)');
    }
    
    console.log('🤖 Calling AI service...');

    // Generate try-on using AI
    // Product image is used as-is (already optimized by Shopify)
    const aiResult = await virtualTryOnAI.generateTryOn({
      userPhoto: finalUserPhoto,
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

    // If using a canned image (NOT user-uploaded photo), cache the result for future use
    if (!userPhoto && cannedImageId && aiResult.resultImage) {
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

