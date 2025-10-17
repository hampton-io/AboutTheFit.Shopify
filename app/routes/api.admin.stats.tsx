import type { LoaderFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { getDashboardStats } from '../services/admin.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    const stats = await getDashboardStats(admin, session.shop);

    return Response.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stats: {
          totalProducts: 0,
          productsWithTryOn: 0,
          totalTryOns: 0,
          creditsUsed: 0,
          creditsRemaining: 0,
        },
      },
      { status: 500 }
    );
  }
};

