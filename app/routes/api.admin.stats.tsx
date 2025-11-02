import type { LoaderFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { getDashboardStats } from '../services/admin.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const startTime = Date.now();
  console.log('[API Stats] Request received');
  
  try {
    console.log('[API Stats] Starting authentication...');
    const { admin, session } = await authenticate.admin(request);
    console.log('[API Stats] Authentication completed in', Date.now() - startTime, 'ms for shop:', session.shop);

    console.log('[API Stats] Fetching dashboard stats...');
    const stats = await getDashboardStats(admin, session, session.shop);
    console.log('[API Stats] ✅ Request completed in', Date.now() - startTime, 'ms');

    return Response.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[API Stats] ❌ Error:', error);
    console.error('[API Stats] Request failed after', Date.now() - startTime, 'ms');
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

