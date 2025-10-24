import prisma from '../db.server';

/**
 * Service for managing canned (pre-selected) images and cached try-on results
 */

/**
 * Get all active canned images
 */
export async function getActiveCannedImages() {
  return prisma.cannedImage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Get a canned image by ID
 */
export async function getCannedImageById(id: string) {
  return prisma.cannedImage.findUnique({
    where: { id },
  });
}

/**
 * Check if a cached try-on exists
 */
export async function getCachedTryOn(params: {
  shop: string;
  cannedImageId: string;
  productId: string;
}) {
  return prisma.cachedTryOn.findUnique({
    where: {
      shop_cannedImageId_productId: {
        shop: params.shop,
        cannedImageId: params.cannedImageId,
        productId: params.productId,
      },
    },
  });
}

/**
 * Create or update a cached try-on result
 */
export async function upsertCachedTryOn(params: {
  shop: string;
  cannedImageId: string;
  productId: string;
  productTitle: string;
  productImage: string;
  resultImageUrl: string;
}) {
  return prisma.cachedTryOn.upsert({
    where: {
      shop_cannedImageId_productId: {
        shop: params.shop,
        cannedImageId: params.cannedImageId,
        productId: params.productId,
      },
    },
    update: {
      resultImageUrl: params.resultImageUrl,
      productTitle: params.productTitle,
      productImage: params.productImage,
      updatedAt: new Date(),
    },
    create: {
      shop: params.shop,
      cannedImageId: params.cannedImageId,
      productId: params.productId,
      productTitle: params.productTitle,
      productImage: params.productImage,
      resultImageUrl: params.resultImageUrl,
    },
  });
}

/**
 * Delete cached try-ons for a specific product (useful when product image changes)
 */
export async function deleteCachedTryOnsForProduct(params: {
  shop: string;
  productId: string;
}) {
  return prisma.cachedTryOn.deleteMany({
    where: {
      shop: params.shop,
      productId: params.productId,
    },
  });
}

/**
 * Get cache statistics for a shop
 */
export async function getCacheStats(shop: string) {
  const totalCached = await prisma.cachedTryOn.count({
    where: { shop },
  });

  const uniqueProducts = await prisma.cachedTryOn.findMany({
    where: { shop },
    distinct: ['productId'],
    select: { productId: true },
  });

  return {
    totalCached,
    uniqueProducts: uniqueProducts.length,
  };
}

