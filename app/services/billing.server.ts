import { authenticate } from '../shopify.server';
import prisma from '../db.server';

// Get app URL - auto-detect from Vercel or use explicit setting
function getAppUrl(): string {
  if (process.env.SHOPIFY_APP_URL) {
    return process.env.SHOPIFY_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.HOST || 'http://localhost:3000';
}

// Check if we're in development mode
function isDevelopmentMode(): boolean {
  // We're in development if NODE_ENV is explicitly 'development' 
  // OR if neither VERCEL_URL nor SHOPIFY_APP_URL is set (local dev)
  return process.env.NODE_ENV === 'development' || 
         (!process.env.VERCEL_URL && !process.env.SHOPIFY_APP_URL);
}

// Define pricing plans based on credit system
const PLANS = {
  FREE: {
    name: "Trial",
    price: 0,
    annualPrice: 0,
    credits: 50,
    productLimit: 3,
    trialDays: 0,
    features: ["50 try-ons per month", "Up to 3 products", "Basic virtual try-on"],
  },
  SIDE_HUSSL: {
    name: "SIde Hussle",
    price: 9.99,
    annualPrice: 99.99, // ~$8.33/month when paid yearly
    credits: 500,
    productLimit: 100,
    trialDays: 7,
    features: ["500 try-ons per month", "Up to 100 products", "Priority support", "Advanced features"],
  },
  BUSINESS: {
    name: "Business",
    price: 39.0,
    annualPrice: 390.0, // ~$32.50/month when paid yearly
    credits: 10000,
    productLimit: -1, // -1 represents unlimited
    trialDays: 14,
    features: ["10,000 try-ons per month", "Unlimited products", "Priority support", "Analytics dashboard"],
  },
  ALL_IN: {
    name: "All In",
    price: 99.0,
    annualPrice: 990.0, // ~$82.50/month when paid yearly
    credits: -1, // -1 represents unlimited
    productLimit: -1, // -1 represents unlimited
    trialDays: 14,
    features: ["Unlimited try-ons", "Unlimited products", "White-label options", "Dedicated support"],
  },
} as const;

type PlanKey = keyof typeof PLANS;

/**
 * Check if app is using managed pricing
 */
async function isManagedPricing(): Promise<boolean> {
  // Check environment variable to explicitly set managed pricing mode
  return process.env.SHOPIFY_MANAGED_PRICING === 'true';
}

/**
 * Sync subscription from Shopify to database (for Managed Pricing)
 * This should be called periodically or when loading the app
 */
export async function syncSubscriptionFromShopify(request: Request): Promise<void> {
  const { admin, session } = await authenticate.admin(request);
  
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
      // Map subscription name to plan key (trim whitespace for comparison)
      const planKey = Object.keys(PLANS).find(key => 
        PLANS[key as PlanKey].name.trim() === activeSubscription.name.trim()
      ) as PlanKey;

      if (planKey) {
        await updateShopPlan(session.shop, planKey);
      } else {
        console.warn(`⚠️ Unknown subscription plan: "${activeSubscription.name}"`);
      }
    } else {
      // No active subscription - set to FREE
      await updateShopPlan(session.shop, 'FREE');
    }
  } catch (error) {
    console.error('Error syncing subscription from Shopify:', error);
    // Don't throw - just log the error
  }
}

/**
 * Create a subscription for a merchant
 */
export async function createSubscription(
  request: Request,
  planKey: PlanKey
): Promise<string> {
  const { admin, session } = await authenticate.admin(request);
  const plan = PLANS[planKey];
  
  // Handle free plan - just cancel any existing subscription and update database
  if (plan.price === 0) {
    
    // Try to cancel any active subscription
    try {
      const response = await admin.graphql(`
        {
          currentAppInstallation {
            activeSubscriptions {
              id
              status
            }
          }
        }
      `);
      
      const data = await response.json();
      const subscriptions = data.data.currentAppInstallation.activeSubscriptions;
      
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
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      // Continue anyway - maybe there was no subscription to cancel
    }
    
    await updateShopPlan(session.shop, planKey);
    return '';
  }

  try {
    const appUrl = getAppUrl();
    const returnUrl = `${appUrl}/api/billing/confirm?shop=${session.shop}&plan=${planKey}`;
    
    // Check if we're in development mode
    const isDevelopment = isDevelopmentMode();
    
    if (isDevelopment) {
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
      const errorMessage = data.data.appSubscriptionCreate.userErrors[0].message;
      
      // Check if this is a managed pricing error
      if (errorMessage.toLowerCase().includes('managed pricing')) {
        
        // For managed pricing, we can't create subscriptions via API
        // But we can update our database to track the intended plan
        await updateShopPlan(session.shop, planKey);
        
        // Return empty string - no confirmation URL needed
        // The merchant has already chosen their plan through Shopify's interface
        return '';
      }
      
      throw new Error(`Billing API error: ${errorMessage}`);
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

  // In development mode, we still need to query Shopify to get accurate pricing
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
                    interval
                  }
                }
              }
            }
          }
        }
      }
    `);

    const data = await response.json();
    
    // Check if we got valid data
    if (!data.data || !data.data.currentAppInstallation) {
      throw new Error('Invalid Shopify response - no currentAppInstallation');
    }
    
    const subscriptions = data.data.currentAppInstallation.activeSubscriptions;
    
    // Find active subscription
    const activeSubscription = subscriptions.find((sub: any) => 
      sub.status === 'ACTIVE'
    );

    if (activeSubscription) {
      // Map subscription name to plan key (trim whitespace for comparison)
      const planKey = Object.keys(PLANS).find(key => 
        PLANS[key as PlanKey].name.trim() === activeSubscription.name.trim()
      ) as PlanKey;

      const pricingDetails = activeSubscription.lineItems[0]?.plan?.pricingDetails;
      let interval = pricingDetails?.interval || 'EVERY_30_DAYS';
      const price = parseFloat(pricingDetails?.price?.amount || '0');

      // For Managed Pricing, detect annual plans by comparing price to our plan definitions
      if (planKey && PLANS[planKey]) {
        const plan = PLANS[planKey];
        // If the price matches the annual price (within $1 tolerance), it's an annual subscription
        if (Math.abs(price - plan.annualPrice) < 1) {
          interval = 'ANNUAL';
        } else if (Math.abs(price - plan.price) < 1) {
          interval = 'EVERY_30_DAYS';
        }
      }

      return {
        isActive: true,
        plan: planKey,
        planName: activeSubscription.name,
        createdAt: activeSubscription.createdAt,
        price,
        interval,
      };
    }

    return {
      isActive: false,
      plan: 'FREE' as PlanKey,
      planName: 'Free Plan',
      createdAt: null,
      price: 0,
      interval: null,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return {
      isActive: false,
      plan: 'FREE' as PlanKey,
      planName: 'Free Plan',
      createdAt: null,
      price: 0,
      interval: null,
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
      productLimit: plan.productLimit,
      isActive: true,
      subscriptionCreatedAt: now,
      lastResetDate: now,
    },
    create: {
      shop,
      creditsUsed: 0,
      creditsLimit: plan.credits,
      productLimit: plan.productLimit,
      isActive: true,
      subscriptionCreatedAt: now,
      lastResetDate: now,
    },
  });
}

/**
 * Check if monthly period has passed and reset credits if needed
 */
export async function checkAndResetMonthlyLimits(shop: string): Promise<void> {
  const metadata = await prisma.appMetadata.findUnique({
    where: { shop },
  });

  if (!metadata) return;

  const now = new Date();
  const lastReset = new Date(metadata.lastResetDate);
  const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

  // Reset if 30 days have passed
  if (daysSinceReset >= 30) {
    await prisma.appMetadata.update({
      where: { shop },
      data: {
        creditsUsed: 0,
        lastResetDate: now,
      },
    });
  }
}

/**
 * Check if shop has exceeded try-on limits
 */
export async function hasTryOnLimitsExceeded(shop: string): Promise<boolean> {
  await checkAndResetMonthlyLimits(shop);
  
  const metadata = await prisma.appMetadata.findUnique({
    where: { shop },
  });

  if (!metadata) return true; // No metadata means no access

  // Unlimited credits (-1)
  if (metadata.creditsLimit === -1) return false;

  return metadata.creditsUsed >= metadata.creditsLimit;
}

/**
 * Check if shop has exceeded product limits
 */
export async function hasProductLimitsExceeded(shop: string): Promise<{ exceeded: boolean; limit: number; current: number }> {
  const metadata = await prisma.appMetadata.findUnique({
    where: { shop },
  });

  if (!metadata) {
    return { exceeded: true, limit: 3, current: 0 };
  }

  // Count enabled products
  const enabledCount = await prisma.productTryOnSettings.count({
    where: {
      shop,
      tryOnEnabled: true,
    },
  });

  // Use the stored productLimit from metadata
  const productLimit = metadata.productLimit || 3;

  // Unlimited products (-1)
  if (productLimit === -1) {
    return { exceeded: false, limit: -1, current: enabledCount };
  }

  return {
    exceeded: enabledCount >= productLimit,
    limit: productLimit,
    current: enabledCount,
  };
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

