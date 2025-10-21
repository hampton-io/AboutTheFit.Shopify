import type { LoaderFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    // Try to create a test subscription to see if we get managed pricing error
    const response = await admin.graphql(`
      mutation {
        appSubscriptionCreate(
          name: "Test Plan",
          returnUrl: "https://example.com",
          test: true,
          lineItems: [{
            plan: {
              appRecurringPricingDetails: {
                price: { amount: 1, currencyCode: "USD" }
                interval: EVERY_30_DAYS
              }
            }
          }]
        ) {
          userErrors {
            field
            message
          }
          confirmationUrl
        }
      }
    `);
    
    const data = await response.json();
    const errors = data.data?.appSubscriptionCreate?.userErrors || [];
    
    const isManagedPricing = errors.some((error: any) => 
      error.message.toLowerCase().includes('managed pricing')
    );
    
    return Response.json({
      isManagedPricing,
      errors,
      message: isManagedPricing 
        ? 'Your app IS using Managed Pricing' 
        : 'Your app can use the Billing API'
    });
  } catch (error) {
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

