import type { TryOnRequestData, AIGenerationRequest } from '../types/tryon';
import { virtualTryOnAI } from './ai.server';
import { uploadResultImage } from './storage.server';
import prisma, { TryOnStatus } from '../db.server';

/**
 * Create a new try-on request in the database
 */
export async function createTryOnRequest(params: {
  shop: string;
  productId: string;
  productTitle: string;
  productImage: string;
  userPhotoUrl: string;
  metadata?: Record<string, any>;
}) {
  const request = await prisma.tryOnRequest.create({
    data: {
      shop: params.shop,
      productId: params.productId,
      productTitle: params.productTitle,
      productImage: params.productImage,
      userPhotoUrl: params.userPhotoUrl,
      status: TryOnStatus.PENDING,
      metadata: params.metadata || {},
    },
  });

  return request;
}

/**
 * Get a try-on request by ID
 */
export async function getTryOnRequest(id: string) {
  const request = await prisma.tryOnRequest.findUnique({
    where: { id },
  });

  return request;
}

/**
 * List try-on requests for a shop
 */
export async function listTryOnRequests(
  shop: string,
  options: {
    status?: TryOnStatus;
    limit?: number;
    offset?: number;
  } = {}
) {
  const where = {
    shop,
    ...(options.status && { status: options.status }),
  };

  const [requests, total] = await Promise.all([
    prisma.tryOnRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
    }),
    prisma.tryOnRequest.count({ where }),
  ]);

  return { requests, total };
}

/**
 * Update try-on request status
 */
export async function updateTryOnStatus(
  id: string,
  status: TryOnStatus,
  updates: {
    resultImageUrl?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  } = {}
) {
  const request = await prisma.tryOnRequest.update({
    where: { id },
    data: {
      status,
      ...updates,
      updatedAt: new Date(),
    },
  });

  return request;
}

/**
 * Process a try-on request
 * This is the main function that coordinates the entire try-on workflow
 */
export async function processTryOnRequest(requestId: string) {
  // Get the request
  const request = await getTryOnRequest(requestId);
  if (!request) {
    throw new Error('Try-on request not found');
  }

  // Update status to processing
  await updateTryOnStatus(requestId, TryOnStatus.PROCESSING);

  try {
    console.log(`Processing try-on request ${requestId}...`);

    // Call AI service to generate try-on
    const aiRequest: AIGenerationRequest = {
      userPhotoUrl: request.userPhotoUrl,
      clothingImageUrl: request.productImage,
      clothingName: request.productTitle,
    };

    const aiResponse = await virtualTryOnAI.generateTryOn({
      userPhoto: aiRequest.userPhotoUrl,
      clothingImage: aiRequest.clothingImageUrl,
      clothingName: aiRequest.clothingName,
    });

    if (!aiResponse.success || !aiResponse.resultImage) {
      throw new Error(aiResponse.error || 'AI generation failed');
    }

    console.log('AI generation successful, uploading result...');

    // Upload result image to storage
    const uploadResult = await uploadResultImage(
      aiResponse.resultImage,
      request.shop,
      requestId
    );

    if (!uploadResult.success || !uploadResult.url) {
      throw new Error(uploadResult.error || 'Failed to upload result image');
    }

    console.log('Result uploaded successfully:', uploadResult.url);

    // Update request with result
    const updatedRequest = await updateTryOnStatus(
      requestId,
      TryOnStatus.COMPLETED,
      {
        resultImageUrl: uploadResult.url,
        metadata: {
          ...(request.metadata as Record<string, any>),
          analysisText: aiResponse.analysisText,
          completedAt: new Date().toISOString(),
        },
      }
    );

    // Increment credits used
    await incrementCreditsUsed(request.shop);

    return updatedRequest;
  } catch (error) {
    console.error('Error processing try-on request:', error);

    // Update request with error
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    const updatedRequest = await updateTryOnStatus(
      requestId,
      TryOnStatus.FAILED,
      {
        errorMessage,
      }
    );

    return updatedRequest;
  }
}

/**
 * Delete a try-on request
 */
export async function deleteTryOnRequest(id: string): Promise<boolean> {
  try {
    await prisma.tryOnRequest.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    console.error('Error deleting try-on request:', error);
    return false;
  }
}

/**
 * Get or create app metadata for a shop
 */
export async function getOrCreateAppMetadata(shop: string) {
  let metadata = await prisma.appMetadata.findUnique({
    where: { shop },
  });

  if (!metadata) {
    metadata = await prisma.appMetadata.create({
      data: {
        shop,
        creditsUsed: 0,
        creditsLimit: 10, // Free tier: 10 try-ons per month
        productLimit: 3,  // Free tier: 3 products max
        isActive: true,
      },
    });
  }

  return metadata;
}

/**
 * Check if shop has credits available
 */
export async function checkCredits(shop: string): Promise<{
  hasCredits: boolean;
  creditsRemaining: number;
  creditsUsed: number;
  creditsLimit: number;
}> {
  const metadata = await getOrCreateAppMetadata(shop);

  const creditsRemaining = metadata.creditsLimit - metadata.creditsUsed;
  const hasCredits = creditsRemaining > 0 && metadata.isActive;

  return {
    hasCredits,
    creditsRemaining,
    creditsUsed: metadata.creditsUsed,
    creditsLimit: metadata.creditsLimit,
  };
}

/**
 * Increment credits used for a shop
 */
export async function incrementCreditsUsed(shop: string): Promise<void> {
  await prisma.appMetadata.update({
    where: { shop },
    data: {
      creditsUsed: {
        increment: 1,
      },
    },
  });
}

/**
 * Reset credits for a shop (useful for testing or billing cycle reset)
 */
export async function resetCredits(shop: string): Promise<void> {
  await prisma.appMetadata.update({
    where: { shop },
    data: {
      creditsUsed: 0,
    },
  });
}

/**
 * Update credits limit for a shop (when they upgrade/downgrade)
 */
export async function updateCreditsLimit(
  shop: string,
  newLimit: number
): Promise<void> {
  await prisma.appMetadata.update({
    where: { shop },
    data: {
      creditsLimit: newLimit,
    },
  });
}

/**
 * Get statistics for a shop
 */
export async function getShopStatistics(shop: string) {
  const [metadata, totalRequests, completedRequests, failedRequests] =
    await Promise.all([
      getOrCreateAppMetadata(shop),
      prisma.tryOnRequest.count({ where: { shop } }),
      prisma.tryOnRequest.count({
        where: { shop, status: TryOnStatus.COMPLETED },
      }),
      prisma.tryOnRequest.count({ where: { shop, status: TryOnStatus.FAILED } }),
    ]);

  return {
    creditsUsed: metadata.creditsUsed,
    creditsLimit: metadata.creditsLimit,
    creditsRemaining: metadata.creditsLimit - metadata.creditsUsed,
    totalRequests,
    completedRequests,
    failedRequests,
    successRate:
      totalRequests > 0
        ? Math.round((completedRequests / totalRequests) * 100)
        : 0,
  };
}

/**
 * Clean up old requests (run periodically)
 */
export async function cleanupOldRequests(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.tryOnRequest.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
      status: {
        in: [TryOnStatus.COMPLETED, TryOnStatus.FAILED],
      },
    },
  });

  return result.count;
}

