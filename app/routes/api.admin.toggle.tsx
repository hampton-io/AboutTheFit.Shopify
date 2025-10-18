import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { toggleProductTryOn } from '../services/admin.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { productId, productTitle, productImage, enabled } = body;

    if (!productId || !productTitle) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await toggleProductTryOn(
      session.shop,
      productId,
      productTitle,
      productImage || '',
      enabled
    );

    if (result.success) {
      return Response.json({
        success: true,
        message: `Try-on ${enabled ? 'enabled' : 'disabled'} for ${productTitle}`,
      });
    } else {
      return Response.json(
        { success: false, error: result.error || 'Failed to update product' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error toggling product:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};

