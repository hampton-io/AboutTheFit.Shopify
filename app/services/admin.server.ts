import type { AdminApiContext } from '@shopify/shopify-app-react-router/server';
import { searchProducts } from './products.server';
import prisma from '../db.server';

export interface ProductWithTryOnStatus {
  id: string;
  title: string;
  handle: string;
  image: string | null;
  tryOnEnabled: boolean;
  tryOnCount?: number;
}

export interface DashboardStats {
  totalProducts: number;
  productsWithTryOn: number;
  totalTryOns: number;
  creditsUsed: number;
  creditsRemaining: number;
}

/**
 * Get all products with their try-on enabled status
 */
export async function getProductsWithTryOnStatus(
  admin: AdminApiContext,
  shop: string,
  options: {
    query?: string;
    first?: number;
    after?: string;
  } = {}
): Promise<{
  products: ProductWithTryOnStatus[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}> {
  // Fetch products from Shopify
  const { products: shopifyProducts, pageInfo } = await searchProducts(
    admin,
    options
  );

  // Get try-on settings from database
  const productIds = shopifyProducts.map((p) => p.id);
  const settings = await prisma.productTryOnSettings.findMany({
    where: {
      shop,
      productId: { in: productIds },
    },
  });

  // Get try-on counts for each product
  const tryOnCounts = await prisma.tryOnRequest.groupBy({
    by: ['productId'],
    where: {
      shop,
      productId: { in: productIds },
    },
    _count: {
      productId: true,
    },
  });

  const tryOnCountMap = new Map(
    tryOnCounts.map((tc) => [tc.productId, tc._count.productId])
  );

  // Create a map of product IDs to try-on enabled status
  const settingsMap = new Map(
    settings.map((s) => [s.productId, s.tryOnEnabled])
  );

  // Merge Shopify products with try-on settings
  const productsWithStatus: ProductWithTryOnStatus[] = shopifyProducts.map(
    (product) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      image: product.featuredImage?.url || null,
      tryOnEnabled: settingsMap.get(product.id) || false,
      tryOnCount: tryOnCountMap.get(product.id) || 0,
    })
  );

  return {
    products: productsWithStatus,
    pageInfo,
  };
}

/**
 * Toggle try-on enabled status for a product
 */
export async function toggleProductTryOn(
  shop: string,
  productId: string,
  productTitle: string,
  productImage: string,
  enabled: boolean
): Promise<boolean> {
  try {
    await prisma.productTryOnSettings.upsert({
      where: {
        shop_productId: {
          shop,
          productId,
        },
      },
      update: {
        tryOnEnabled: enabled,
        productTitle,
        productImage,
      },
      create: {
        shop,
        productId,
        productTitle,
        productImage,
        tryOnEnabled: enabled,
      },
    });

    return true;
  } catch (error) {
    console.error('Error toggling product try-on:', error);
    return false;
  }
}

/**
 * Bulk enable/disable try-on for multiple products
 */
export async function bulkToggleProductTryOn(
  shop: string,
  products: Array<{
    productId: string;
    productTitle: string;
    productImage: string;
  }>,
  enabled: boolean
): Promise<number> {
  try {
    let count = 0;
    for (const product of products) {
      const success = await toggleProductTryOn(
        shop,
        product.productId,
        product.productTitle,
        product.productImage,
        enabled
      );
      if (success) count++;
    }
    return count;
  } catch (error) {
    console.error('Error bulk toggling products:', error);
    return 0;
  }
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(
  admin: AdminApiContext,
  shop: string
): Promise<DashboardStats> {
  // Get total products from Shopify
  const { products } = await searchProducts(admin, { first: 1 });
  // Note: This is a simplified count, in production you'd use a dedicated count query

  // Get products with try-on enabled
  const productsWithTryOn = await prisma.productTryOnSettings.count({
    where: {
      shop,
      tryOnEnabled: true,
    },
  });

  // Get total try-ons
  const totalTryOns = await prisma.tryOnRequest.count({
    where: { shop },
  });

  // Get credit info
  const metadata = await prisma.appMetadata.findUnique({
    where: { shop },
  });

  const creditsUsed = metadata?.creditsUsed || 0;
  const creditsLimit = metadata?.creditsLimit || 10;

  return {
    totalProducts: products.length, // This is simplified, should be actual count
    productsWithTryOn,
    totalTryOns,
    creditsUsed,
    creditsRemaining: Math.max(0, creditsLimit - creditsUsed),
  };
}

/**
 * Get products that have try-on enabled
 */
export async function getEnabledProducts(shop: string) {
  return prisma.productTryOnSettings.findMany({
    where: {
      shop,
      tryOnEnabled: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
}

/**
 * Check if a product has try-on enabled
 */
export async function isProductTryOnEnabled(
  shop: string,
  productId: string
): Promise<boolean> {
  const settings = await prisma.productTryOnSettings.findUnique({
    where: {
      shop_productId: {
        shop,
        productId,
      },
    },
  });

  return settings?.tryOnEnabled || false;
}

/**
 * Get try-on analytics for admin
 */
export async function getTryOnAnalytics(shop: string) {
  const [
    totalRequests,
    completedRequests,
    failedRequests,
    recentRequests,
    topProducts,
  ] = await Promise.all([
    // Total requests
    prisma.tryOnRequest.count({ where: { shop } }),

    // Completed requests
    prisma.tryOnRequest.count({
      where: { shop, status: 'COMPLETED' },
    }),

    // Failed requests
    prisma.tryOnRequest.count({
      where: { shop, status: 'FAILED' },
    }),

    // Recent 10 requests
    prisma.tryOnRequest.findMany({
      where: { shop },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    // Top 5 products by try-on count
    prisma.tryOnRequest.groupBy({
      by: ['productId', 'productTitle'],
      where: { shop, status: 'COMPLETED' },
      _count: {
        productId: true,
      },
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  return {
    totalRequests,
    completedRequests,
    failedRequests,
    successRate:
      totalRequests > 0
        ? Math.round((completedRequests / totalRequests) * 100)
        : 0,
    recentRequests,
    topProducts,
  };
}

