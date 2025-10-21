import type { LoaderFunctionArgs } from 'react-router';
import { getSubscriptionStatus, syncSubscriptionFromShopify } from '../services/billing.server';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // First, sync subscription from Shopify (for Managed Pricing)
    // This ensures database is up-to-date with Shopify's subscription state
    await syncSubscriptionFromShopify(request);
    
    // Then get the subscription status (which now reads from our updated database)
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
