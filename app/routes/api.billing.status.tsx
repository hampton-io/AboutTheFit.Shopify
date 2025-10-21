import type { LoaderFunctionArgs } from 'react-router';
import { getSubscriptionStatus, syncSubscriptionFromShopify } from '../services/billing.server';

export async function loader({ request }: LoaderFunctionArgs) {
  console.log('\n💳 ===== BILLING STATUS API CALLED =====');
  console.log('💳 URL:', request.url);
  console.log('💳 Time:', new Date().toISOString());
  
  try {
    // First, sync subscription from Shopify (for Managed Pricing)
    // This ensures database is up-to-date with Shopify's subscription state
    console.log('💳 Step 1: Syncing from Shopify...');
    await syncSubscriptionFromShopify(request);
    
    // Then get the subscription status (which now reads from our updated database)
    console.log('💳 Step 2: Getting subscription status from database...');
    const subscriptionStatus = await getSubscriptionStatus(request);
    
    console.log('💳 Final subscription status:', JSON.stringify(subscriptionStatus, null, 2));
    console.log('💳 ===== BILLING STATUS API SUCCESS =====\n');
    
    return Response.json({ 
      success: true, 
      subscription: subscriptionStatus 
    });
  } catch (error) {
    console.error('❌ Billing status error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.log('💳 ===== BILLING STATUS API FAILED =====\n');
    return Response.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get subscription status' 
      }, 
      { status: 500 }
    );
  }
}
