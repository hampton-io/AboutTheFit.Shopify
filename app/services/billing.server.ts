import { authenticate } from '../shopify.server';
import prisma from '../db.server';

// Define pricing plans based on credit system
const PLANS = {
  FREE: {
    name: "Free Plan",
    price: 0,
    credits: 10,
    trialDays: 0,
    features: ["10 credits per month", "Basic virtual try-on"],
  },
  SIDE_HUSSL: {
    name: "Side Hussle",
    price: 9.99,
    credits: 500,
    trialDays: 7,
    features: ["500 credits per month", "Priority support", "Advanced features"],
  },
  BUSINESS: {
    name: "Business",
    price: 39.0,
    credits: 10000,
    trialDays: 14,
    features: ["10,000 credits per month", "Priority support", "Analytics dashboard"],
  },
  ALL_IN: {
    name: "All In",
    price: 99.0,
    credits: -1, // -1 represents unlimited
    trialDays: 14,
    features: ["Unlimited credits", "White-label options", "Dedicated support"],
  },
} as const;

type PlanKey = keyof typeof PLANS;

/**
 * Create a subscription for a merchant
 */
export async function createSubscription(
  request: Request,
  planKey: PlanKey
): Promise<string> {
  console.log('🔧 createSubscription called with planKey:', planKey);
  const { admin, session } = await authenticate.admin(request);
  const plan = PLANS[planKey];
  
  console.log('📋 Plan details:', plan);
  console.log('🏪 Shop:', session.shop);
  
  if (plan.price === 0) {
    console.log('💰 Free plan - updating database');
    // Handle free plan - just update database
    await updateShopPlan(session.shop, planKey);
    return `/app?plan=free&success=true`;
  }

  try {
    console.log('🔧 SHOPIFY_APP_URL:', process.env.SHOPIFY_APP_URL);
    const returnUrl = `${process.env.SHOPIFY_APP_URL || 'https://example.com'}/api/billing/confirm?shop=${session.shop}&plan=${planKey}`;
    console.log('🔗 Return URL:', returnUrl);
    
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.SHOPIFY_APP_URL;
    
    if (isDevelopment) {
      console.log('🧪 Development mode: Simulating billing approval');
      // In development, directly update the plan without going through Shopify Billing API
      await updateShopPlan(session.shop, planKey);
      // Return empty string to signal dev mode success (no redirect)
      return '';
    }
    
    // Create recurring charge via Shopify Billing API
    const response = await admin.graphql(`
      mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int) {
        appSubscriptionCreate(
          name: $name,
          lineItems: $lineItems,
          returnUrl: $returnUrl,
          trialDays: $trialDays
        ) {
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        name: plan.name,
        returnUrl: returnUrl,
        trialDays: plan.trialDays,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: plan.price, currencyCode: "USD" },
                interval: "EVERY_30_DAYS",
              },
            },
          },
        ],
      },
    });

    const data = await response.json();
    
    if (data.data.appSubscriptionCreate.userErrors.length > 0) {
      throw new Error(`Billing API error: ${data.data.appSubscriptionCreate.userErrors[0].message}`);
    }

    return data.data.appSubscriptionCreate.confirmationUrl;
  } catch (error) {
    console.error('💥 Error creating subscription:', error);
    console.error('💥 Error details:', error instanceof Error ? error.message : String(error));
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack');
    throw error instanceof Error ? error : new Error('Failed to create subscription');
  }
}

/**
 * Confirm subscription after merchant approval
 */
export async function confirmSubscription(request: Request): Promise<boolean> {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const planKey = url.searchParams.get('plan') as PlanKey;
  
  if (!planKey || !PLANS[planKey]) {
    throw new Error('Invalid plan specified');
  }

  try {
    // Get current active subscriptions
    const response = await admin.graphql(`
      {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            lineItems {
              plan {
                pricingDetails {
                  __typename
                  ... on AppRecurringPricing {
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);

    const data = await response.json();
    const subscriptions = data.data.currentAppInstallation.activeSubscriptions;
    
    // Find the most recent subscription
    const activeSubscription = subscriptions.find((sub: any) => 
      sub.status === 'ACTIVE' && sub.name === PLANS[planKey].name
    );

    if (activeSubscription) {
      // Update shop plan in database
      await updateShopPlan(session.shop, planKey);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error confirming subscription:', error);
    return false;
  }
}

/**
 * Cancel current subscription
 */
export async function cancelSubscription(request: Request): Promise<boolean> {
  const { admin, session } = await authenticate.admin(request);

  try {
    // Get current subscriptions
    const response = await admin.graphql(`
      {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
          }
        }
      }
    `);

    const data = await response.json();
    const subscriptions = data.data.currentAppInstallation.activeSubscriptions;
    
    // Cancel all active subscriptions
    for (const subscription of subscriptions) {
      if (subscription.status === 'ACTIVE') {
        await admin.graphql(`
          mutation appSubscriptionCancel($id: ID!) {
            appSubscriptionCancel(id: $id) {
              appSubscription {
                id
                status
              }
              userErrors {
                field
                message
              }
            }
          }
        `, {
          variables: { id: subscription.id },
        });
      }
    }

    // Downgrade to free plan
    await updateShopPlan(session.shop, 'FREE');
    return true;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return false;
  }
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(request: Request) {
  const { admin, session } = await authenticate.admin(request);

  // In development mode, always check our database first
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.SHOPIFY_APP_URL;
  
  if (isDevelopment) {
    console.log('🧪 Development mode: Checking database for subscription');
    try {
      const metadata = await prisma.appMetadata.findUnique({
        where: { shop: session.shop },
      });

      if (metadata && metadata.creditsLimit) {
        // Find the plan based on credits limit
        const planKey = Object.keys(PLANS).find(key => 
          PLANS[key as PlanKey].credits === metadata.creditsLimit
        ) as PlanKey || 'FREE';
        
        const plan = PLANS[planKey];
        
        return {
          isActive: metadata.isActive,
          plan: planKey,
          planName: plan.name,
          createdAt: metadata.subscriptionCreatedAt?.toISOString() || null,
          price: plan.price,
        };
      }
    } catch (error) {
      console.error('Error reading from database:', error);
    }
  }

  try {
    const response = await admin.graphql(`
      {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            createdAt
            lineItems {
              plan {
                pricingDetails {
                  __typename
                  ... on AppRecurringPricing {
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);

    const data = await response.json();
    const subscriptions = data.data.currentAppInstallation.activeSubscriptions;
    
    // Find active subscription
    const activeSubscription = subscriptions.find((sub: any) => 
      sub.status === 'ACTIVE'
    );

    if (activeSubscription) {
      // Map subscription name to plan key
      const planKey = Object.keys(PLANS).find(key => 
        PLANS[key as PlanKey].name === activeSubscription.name
      ) as PlanKey;

      return {
        isActive: true,
        plan: planKey,
        planName: activeSubscription.name,
        createdAt: activeSubscription.createdAt,
        price: activeSubscription.lineItems[0]?.plan?.pricingDetails?.price?.amount || 0,
      };
    }

    return {
      isActive: false,
      plan: 'FREE' as PlanKey,
      planName: 'Free Plan',
      createdAt: null,
      price: 0,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return {
      isActive: false,
      plan: 'FREE' as PlanKey,
      planName: 'Free Plan',
      createdAt: null,
      price: 0,
    };
  }
}

/**
 * Update shop plan in database
 */
async function updateShopPlan(shop: string, planKey: PlanKey): Promise<void> {
  const plan = PLANS[planKey];
  const now = new Date();
  
  await prisma.appMetadata.upsert({
    where: { shop },
    update: {
      creditsLimit: plan.credits,
      isActive: true,
      subscriptionCreatedAt: now,
    },
    create: {
      shop,
      creditsUsed: 0,
      creditsLimit: plan.credits,
      isActive: true,
      subscriptionCreatedAt: now,
    },
  });
}

/**
 * Check if shop can upgrade to a plan
 */
export async function canUpgradeToPlan(
  request: Request,
  targetPlanKey: PlanKey
): Promise<boolean> {
  const subscriptionStatus = await getSubscriptionStatus(request);
  const currentPlan = PLANS[subscriptionStatus.plan];
  const targetPlan = PLANS[targetPlanKey];

  // Can always upgrade to a higher tier
  return targetPlan.price > currentPlan.price;
}

