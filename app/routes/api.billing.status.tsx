import type { LoaderFunctionArgs } from 'react-router';
import { getSubscriptionStatus } from '../services/billing.server';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const subscriptionStatus = await getSubscriptionStatus(request);
    
    return Response.json({ 
      success: true, 
      subscription: subscriptionStatus 
    });
  } catch (error) {
    console.error('Billing status error:', error);
    return Response.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get subscription status' 
      }, 
      { status: 500 }
    );
  }
}
