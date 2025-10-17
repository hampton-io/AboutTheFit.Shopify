import type { LoaderFunctionArgs } from 'react-router';
import { confirmSubscription } from '../services/billing.server';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const success = await confirmSubscription(request);
    
    if (success) {
      return Response.redirect('/app?billing=success&message=Subscription activated successfully!');
    } else {
      return Response.redirect('/app?billing=error&message=Failed to activate subscription');
    }
  } catch (error) {
    console.error('Billing confirmation error:', error);
    return Response.redirect('/app?billing=error&message=Subscription confirmation failed');
  }
}
