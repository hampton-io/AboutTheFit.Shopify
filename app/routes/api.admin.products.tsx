import type { LoaderFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { getProductsWithTryOnStatus } from '../services/admin.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const query = url.searchParams.get('query') || '';
  const after = url.searchParams.get('after') || undefined;
  const first = parseInt(url.searchParams.get('first') || '20', 10);

  try {
    const result = await getProductsWithTryOnStatus(admin, session.shop, {
      query,
      first,
      after,
    });

    return Response.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        products: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
      { status: 500 }
    );
  }
};

