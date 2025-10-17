import type { ActionFunctionArgs } from 'react-router';
import { createSubscription } from '../services/billing.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    console.log('🔧 Billing create action called');
    const formData = await request.formData();
    const planKey = formData.get('plan') as string;
    
    console.log('📋 Plan key received:', planKey);

    if (!planKey) {
      console.log('❌ No plan key provided');
      return Response.json({ error: 'Plan is required' }, { status: 400 });
    }

    console.log('🚀 Creating subscription for plan:', planKey);
    const confirmationUrl = await createSubscription(request, planKey as any);
    console.log('✅ Subscription created, confirmation URL:', confirmationUrl);
    
    // If no confirmation URL (dev mode), return success without URL
    if (!confirmationUrl) {
      return Response.json({ 
        success: true, 
        message: 'Plan upgraded successfully!' 
      });
    }
    
    return Response.json({ 
      success: true, 
      confirmationUrl,
      message: 'Redirecting to billing confirmation...' 
    });
  } catch (error) {
    console.error('❌ Billing creation error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    return Response.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create subscription',
        details: error instanceof Error ? error.stack : String(error)
      }, 
      { status: 500 }
    );
  }
}
