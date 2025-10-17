import type { ActionFunctionArgs } from 'react-router';
import { cancelSubscription } from '../services/billing.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const success = await cancelSubscription(request);
    
    if (success) {
      return Response.json({ 
        success: true, 
        message: 'Subscription cancelled successfully. You have been downgraded to the free plan.' 
      });
    } else {
      return Response.json({ 
        error: 'Failed to cancel subscription' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Billing cancellation error:', error);
    return Response.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to cancel subscription' 
      }, 
      { status: 500 }
    );
  }
}
