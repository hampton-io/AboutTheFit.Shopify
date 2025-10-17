import type { LoaderFunctionArgs } from 'react-router';
import db from '../db.server';

/**
 * Check if try-on is enabled for a specific product
 * Accessible via: /apps/aboutthefit/check-enabled?productId=xxx
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const url = new URL(request.url);
    let productId = url.searchParams.get('productId');
    const shop = url.searchParams.get('shop');

    console.log('Check enabled - raw productId:', productId);
    console.log('Check enabled - shop:', shop);

    if (!productId) {
      return Response.json({ enabled: false }, { status: 400 });
    }

    // Build both formats to check against database
    // Database might store either "123456789" or "gid://shopify/Product/123456789"
    const numericId = productId.includes('gid://shopify/Product/') 
      ? productId.split('/').pop() 
      : productId;
    const gidFormat = productId.includes('gid://shopify/Product/') 
      ? productId 
      : `gid://shopify/Product/${productId}`;

    console.log('Numeric ID:', numericId);
    console.log('GID format:', gidFormat);

    // Check if try-on is enabled for this product (try both formats)
    const settings = await db.productTryOnSettings.findFirst({
      where: {
        OR: [
          { productId: numericId },
          { productId: gidFormat },
        ],
        ...(shop ? { shop } : {}),
        tryOnEnabled: true,
      },
    });

    console.log('Settings found:', !!settings);

    return Response.json({
      enabled: !!settings,
    });
  } catch (error) {
    console.error('Error checking try-on status:', error);
    return Response.json({ enabled: false }, { status: 500 });
  }
};

