import { useEffect, useState } from 'react';
import type { LoaderFunctionArgs, HeadersFunction } from 'react-router';
import { useLoaderData, useFetcher } from 'react-router';
import { authenticate } from '../shopify.server';
import { boundary } from '@shopify/shopify-app-react-router/server';
import { useAppBridge } from '@shopify/app-bridge-react';
// Inline plans data to avoid SSR issues
const PLANS = {
  FREE: {
    name: "Free Plan",
    price: 0,
    credits: 50,
    productLimit: 3,
    trialDays: 0,
    features: ["Up to 3 products", "Basic virtual try-on"],
  },
  SIDE_HUSSL: {
    name: "Side Hussle",
    price: 9.99,
    credits: 500,
    productLimit: 100,
    trialDays: 7,
    features: ["Up to 100 products", "Priority support", "Advanced features"],
  },
  BUSINESS: {
    name: "Business",
    price: 39.0,
    credits: 10000,
    productLimit: -1, // -1 represents unlimited
    trialDays: 14,
    features: ["Unlimited products", "Priority support", "Analytics dashboard"],
  },
  ALL_IN: {
    name: "All In",
    price: 99.0,
    credits: -1, // -1 represents unlimited
    productLimit: -1, // -1 represents unlimited
    trialDays: 14,
    features: ["Unlimited products", "White-label options", "Dedicated support"],
  },
} as const;

type PlanKey = keyof typeof PLANS;

function getAllPlans() {
  return Object.entries(PLANS).map(([key, plan]) => ({
    key: key as PlanKey,
    ...plan,
  }));
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

interface Product {
  id: string;
  title: string;
  handle: string;
  image: string | null;
  tryOnEnabled: boolean;
  tryOnCount?: number;
}

interface Stats {
  totalProducts: number;
  productsWithTryOn: number;
  totalTryOns: number;
  creditsUsed: number;
  creditsRemaining: number;
  creditsLimit: number;
  productLimit: number;
  daysUntilReset: number;
}

interface Subscription {
  isActive: boolean;
  plan: PlanKey;
  planName: string;
  createdAt: string | null;
  price: number;
}

export default function Index() {
  const shopify = useAppBridge();
  const productsFetcher = useFetcher<any>();
  const statsFetcher = useFetcher<any>();
  const toggleFetcher = useFetcher<any>();
  const billingFetcher = useFetcher<any>();
  const billingCancelFetcher = useFetcher<any>();

  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showBillingModal, setShowBillingModal] = useState(false);
  
  // Debug modal visibility
  useEffect(() => {
    console.log('💳 showBillingModal changed to:', showBillingModal);
  }, [showBillingModal]);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);

  const plans = getAllPlans();

  // Load initial data
  useEffect(() => {
    productsFetcher.load('/api/admin/products?first=50');
    statsFetcher.load('/api/admin/stats');
    billingFetcher.load('/api/billing/status');
  }, []);

  // Update products when fetcher returns
  useEffect(() => {
    if (productsFetcher.data?.success) {
      setProducts(productsFetcher.data.products || []);
      setIsLoading(false);
    }
  }, [productsFetcher.data]);

  // Update stats when fetcher returns
  useEffect(() => {
    if (statsFetcher.data?.success) {
      setStats(statsFetcher.data.stats);
      setIsLoading(false);
    }
  }, [statsFetcher.data]);

  // Update subscription when fetcher returns
  useEffect(() => {
    if (billingFetcher.data?.success && billingFetcher.data.subscription) {
      setSubscription(billingFetcher.data.subscription);
    }
  }, [billingFetcher.data]);

  // Handle toggle success or error
  useEffect(() => {
    if (toggleFetcher.data?.success) {
      shopify.toast.show(toggleFetcher.data.message || 'Updated successfully');
      // Reload products and stats
      productsFetcher.load('/api/admin/products?first=50');
      statsFetcher.load('/api/admin/stats');
    } else if (toggleFetcher.data?.error) {
      shopify.toast.show(toggleFetcher.data.error, { isError: true });
    }
  }, [toggleFetcher.data]);

  const handleToggle = (product: Product, enabled: boolean) => {
    toggleFetcher.submit(
      JSON.stringify({
        productId: product.id,
        productTitle: product.title,
        productImage: product.image || '',
        enabled,
      }),
      {
        method: 'POST',
        action: '/api/admin/toggle',
        encType: 'application/json',
      }
    );
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (value.length > 2 || value.length === 0) {
      productsFetcher.load(
        `/api/admin/products?first=50${value ? `&query=${encodeURIComponent(value)}` : ''}`
      );
    }
  };

  const handleUpgradePlan = (planKey: PlanKey) => {
    console.log('🔧 Upgrade plan clicked:', planKey);
    setSelectedPlan(planKey);
    billingFetcher.submit(
      { plan: planKey },
      { method: 'POST', action: '/api/billing/create' }
    );
  };

  const handleCancelSubscription = () => {
    if (confirm('Are you sure you want to cancel your subscription? You will be downgraded to the free plan.')) {
      billingCancelFetcher.submit(
        {},
        { method: 'POST', action: '/api/billing/cancel' }
      );
    }
  };

  // Handle billing responses
  useEffect(() => {
    console.log('🔔 billingFetcher.data changed:', billingFetcher.data);
    console.log('🔔 billingFetcher.state:', billingFetcher.state);
    
    if (billingFetcher.data?.success && billingFetcher.state === 'idle') {
      if (billingFetcher.data.confirmationUrl) {
        console.log('✅ Redirecting to:', billingFetcher.data.confirmationUrl);
        window.location.href = billingFetcher.data.confirmationUrl;
      } else if (billingFetcher.data.message && showBillingModal) {
        // Success without confirmation URL (development mode) - only if modal is open
        console.log('✅ Plan upgraded successfully (dev mode)');
        shopify.toast.show(billingFetcher.data.message);
        setShowBillingModal(false);
        // Reload subscription status and stats
        setTimeout(() => {
          billingFetcher.load('/api/billing/status');
          statsFetcher.load('/api/admin/stats');
        }, 100);
      }
    } else if (billingFetcher.data?.error) {
      console.log('❌ Billing error:', billingFetcher.data.error);
      shopify.toast.show(billingFetcher.data.error, { isError: true });
    }
  }, [billingFetcher.data, billingFetcher.state, showBillingModal]);

  useEffect(() => {
    if (billingCancelFetcher.data?.success) {
      shopify.toast.show(billingCancelFetcher.data.message);
      billingFetcher.load('/api/billing/status');
      statsFetcher.load('/api/admin/stats');
    } else if (billingCancelFetcher.data?.error) {
      shopify.toast.show(billingCancelFetcher.data.error, { isError: true });
    }
  }, [billingCancelFetcher.data]);

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <s-page heading="About the Fit - Virtual Try-On">
      {/* Stats Cards */}
      {stats && (
        <s-section>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
            }}
          >
            {/* Products with Try-On Enabled */}
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                  Products with Try-On
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', lineHeight: '1' }}>
                    {stats.productsWithTryOn}
                  </div>
                  <s-text tone="neutral">
                    {stats.productLimit === -1 
                      ? 'active' 
                      : `of ${stats.productLimit}`}
                  </s-text>
                </div>
                {stats.productLimit === -1 ? (
                  <s-text tone="success">
                    <strong>Unlimited products allowed on your subscription</strong>
                  </s-text>
                ) : stats.productsWithTryOn >= stats.productLimit ? (
                  <>
                    <s-text tone="warning">
                      You've reached your {subscription?.planName || 'plan'} subscription limit
                    </s-text>
                    <s-text tone="critical">
                      <strong>Upgrade your plan to enable more</strong>
                    </s-text>
                  </>
                ) : (
                  <>
                    <s-text tone="success">
                      Your {subscription?.planName || 'current plan'} subscription allows {stats.productLimit - stats.productsWithTryOn} more {stats.productLimit - stats.productsWithTryOn === 1 ? 'product' : 'products'}
                    </s-text>
                  </>
                )}
              </s-stack>
            </s-box>

            {/* Customer Engagement */}
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                  Customer Engagement
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700', lineHeight: '1' }}>
                  {stats.totalTryOns}
                </div>
                <s-text tone="neutral">
                  {stats.totalTryOns === 0 
                    ? 'No try-ons yet' 
                    : stats.totalTryOns === 1 
                      ? 'try-on this month'
                      : 'try-ons this month'}
                </s-text>
                {stats.totalTryOns === 0 ? (
                  <s-text tone="neutral">
                    Enable try-on on products below to start
                  </s-text>
                ) : (
                  <s-text tone="success">
                    Customers are trying before buying! 🎉
                  </s-text>
                )}
              </s-stack>
            </s-box>

            {/* Monthly Try-On Allowance */}
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                  Monthly Try-On Allowance
                </div>
                {stats.creditsLimit === -1 ? (
                  <>
                    <div style={{ fontSize: '32px', fontWeight: '700', lineHeight: '1' }}>∞</div>
                    <s-text tone="success">
                      <strong>Unlimited try-ons</strong>
                    </s-text>
                    <s-text tone="neutral">
                      {stats.creditsUsed === 0 
                        ? 'Ready for unlimited customers'
                        : `${stats.creditsUsed} ${stats.creditsUsed === 1 ? 'try-on' : 'try-ons'} used so far`}
                    </s-text>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <div style={{ fontSize: '32px', fontWeight: '700', lineHeight: '1' }}>
                        {stats.creditsRemaining}
                      </div>
                      <s-text tone="neutral">remaining</s-text>
                    </div>
                    <s-text tone="neutral">
                      {stats.creditsUsed === 0 
                        ? `${stats.creditsLimit} try-ons available`
                        : `${stats.creditsUsed} of ${stats.creditsLimit} used`}
                    </s-text>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                      Resets {stats.daysUntilReset === 0 ? 'today' : stats.daysUntilReset === 1 ? 'tomorrow' : `in ${stats.daysUntilReset} days`}
                    </div>
                    {stats.creditsRemaining < stats.creditsLimit * 0.2 && stats.creditsRemaining > 0 && (
                      <s-text tone="warning">
                        <strong>Running low!</strong>
                      </s-text>
                    )}
                  </>
                )}
                <div style={{ 
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid #E5E7EB',
                  fontSize: '12px',
                  color: '#6B7280',
                  fontStyle: 'italic'
                }}>
                  {stats.creditsLimit === -1 
                    ? 'Note: The "Try it On" button is always available to customers'
                    : 'Note: The "Try it On" button will not appear to customers when your allowance is used'}
                </div>
              </s-stack>
            </s-box>

            {/* Billing & Plans */}
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                  Your Subscription
                </div>
                {subscription && (
                  <>
                    <div style={{ fontSize: '24px', fontWeight: '700', lineHeight: '1' }}>
                      {subscription.planName}
                    </div>
                    {subscription.price > 0 ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <div style={{ fontSize: '28px', fontWeight: '700', lineHeight: '1' }}>
                            ${subscription.price}
                          </div>
                          <s-text tone="neutral">/month</s-text>
                        </div>
                        <s-text tone="neutral">Billed monthly</s-text>
                      </>
                    ) : (
                      <>
                        <s-text tone="success">
                          <strong>✓ No payment required</strong>
                        </s-text>
                        <s-text tone="neutral">
                          {stats?.creditsLimit} try-ons • {stats?.productLimit} products/month
                        </s-text>
                      </>
                    )}
                    {subscription.createdAt && (
                      <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                        Member since {new Date(subscription.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <s-button
                        variant="primary"
                        onClick={() => {
                          console.log('🔵 Upgrade Plan button clicked');
                          setShowBillingModal(true);
                        }}
                        disabled={billingFetcher.state === 'submitting'}
                      >
                        {billingFetcher.state === 'submitting' ? 'Loading...' : subscription.price > 0 ? 'Change Plan' : 'Upgrade Plan'}
                      </s-button>
                      {subscription.price > 0 && (
                        <s-button
                          variant="secondary"
                          onClick={handleCancelSubscription}
                          disabled={billingCancelFetcher.state === 'submitting'}
                        >
                          {billingCancelFetcher.state === 'submitting' ? 'Cancelling...' : 'Cancel Subscription'}
                        </s-button>
                      )}
                    </div>
                  </>
                )}
              </s-stack>
            </s-box>
          </div>
        </s-section>
      )}

      {/* Warning Banners */}
      {stats && stats.creditsLimit !== -1 && stats.creditsRemaining < stats.creditsLimit * 0.2 && (
        <s-section>
          <div style={{ 
            backgroundColor: '#fff4e5', 
            border: '1px solid #ffc453', 
            borderRadius: '8px',
            padding: '16px'
          }}>
            <s-stack direction="block" gap="base">
              <div style={{ fontWeight: 'bold', color: '#996f00' }}>
                ⚠️ Try-On Limit Warning
              </div>
              <div style={{ color: '#663c00' }}>
                You're running low on try-ons! You have {stats.creditsRemaining} of {stats.creditsLimit} remaining this month. 
                Resets in {stats.daysUntilReset} days.
              </div>
              <s-button 
                variant="primary" 
                onClick={() => setShowBillingModal(true)}
              >
                Upgrade Plan
              </s-button>
            </s-stack>
          </div>
        </s-section>
      )}

      {stats && stats.productLimit !== -1 && stats.productsWithTryOn >= stats.productLimit && (
        <s-section>
          <div style={{ 
            backgroundColor: '#ffeaea', 
            border: '1px solid #ff5252', 
            borderRadius: '8px',
            padding: '16px'
          }}>
            <s-stack direction="block" gap="base">
              <div style={{ fontWeight: 'bold', color: '#c41e3a' }}>
                🚫 Product Limit Reached
              </div>
              <div style={{ color: '#a01829' }}>
                You've reached your product limit of {stats.productLimit}. Upgrade your plan to enable try-on for more products.
              </div>
              <s-button 
                variant="primary" 
                onClick={() => setShowBillingModal(true)}
              >
                Upgrade Plan
              </s-button>
            </s-stack>
          </div>
        </s-section>
      )}

      {/* Product Management Section */}
      <s-section heading="Manage Products">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Enable virtual try-on for individual products below.
          </s-paragraph>

          {/* Search */}
          <s-text-field
            label="Search products"
            value={searchQuery}
            onChange={(e: any) => handleSearch(e.target.value)}
            placeholder="Search by product name..."
          />

          {/* Products List */}
          {isLoading ? (
            <s-box padding="large">
              <div style={{ textAlign: 'center' }}>
                <s-spinner size="large" />
                <s-text>Loading products...</s-text>
              </div>
            </s-box>
          ) : filteredProducts.length === 0 ? (
            <s-box padding="large" borderWidth="base" borderRadius="base">
              <div style={{ textAlign: 'center' }}>
                <s-heading>No products found</s-heading>
                <s-text>
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Add products to your store to get started'}
                </s-text>
              </div>
            </s-box>
          ) : (
            <s-stack direction="block" gap="base">
              {filteredProducts.map((product) => (
                <s-box
                  key={product.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                  >
                    {/* Product Image */}
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        style={{
                          width: '60px',
                          height: '60px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '60px',
                          height: '60px',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <s-text>No image</s-text>
                      </div>
                    )}

                    {/* Product Info */}
                    <div style={{ flex: 1 }}>
                      <s-stack direction="block" gap="base">
                        <s-heading>{product.title}</s-heading>
                        {product.tryOnCount !== undefined &&
                          product.tryOnCount > 0 && (
                            <s-text tone="neutral">
                              {product.tryOnCount} try-on
                              {product.tryOnCount !== 1 ? 's' : ''} generated
                            </s-text>
                          )}
                      </s-stack>
                    </div>

                    {/* Toggle Switch */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <s-text>
                        {product.tryOnEnabled ? 'Enabled' : 'Disabled'}
                      </s-text>
                      <s-switch
                        checked={product.tryOnEnabled}
                        onChange={(e: any) =>
                          handleToggle(product, e.target.checked)
                        }
                        disabled={toggleFetcher.state !== 'idle'}
                      />
                    </div>
                  </div>
                </s-box>
              ))}
            </s-stack>
          )}
        </s-stack>
      </s-section>

      {/* Help Section */}
      <s-section slot="aside" heading="How it works">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <strong>1. Enable try-on</strong> for products you want customers to
            virtually try on
          </s-paragraph>
          <s-paragraph>
            <strong>2. Customers upload</strong> their photo on the product page
          </s-paragraph>
          <s-paragraph>
            <strong>3. AI generates</strong> a realistic image of them wearing
            the product
          </s-paragraph>
          <s-paragraph>
            <strong>4. Customers see</strong> how they look before buying
          </s-paragraph>
        </s-stack>
      </s-section>

      {/* Setup Section */}
      <s-section slot="aside" heading="Add About the Fit to your product pages">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Add the try-on button to your product pages so customers can see how items look on them before buying.
          </s-paragraph>
          <s-paragraph>
            <strong>1. Go to Online Store</strong> → Themes
          </s-paragraph>
          <s-paragraph>
            <strong>2. Click Customize</strong> on your active theme
          </s-paragraph>
          <s-paragraph>
            <strong>3. Navigate to a Product page</strong>
          </s-paragraph>
          <s-paragraph>
            <strong>4. Click Add app block</strong> and select "ATF - Try it on Button"
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Need help?">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <a href="/app/additional">View analytics</a>
          </s-paragraph>
          <s-paragraph>
            <a href="https://www.revuapp.io/submit/cmguzyiw40001l1046f965l8a" target="_blank" rel="noopener noreferrer">
              Contact support
            </a>
          </s-paragraph>
        </s-stack>
      </s-section>

      {/* Billing Plans Modal */}
      {showBillingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Choose Your Plan</h2>
              <button
                onClick={() => {
                  console.log('🔴 Close button clicked');
                  setShowBillingModal(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {plans.map((plan) => (
                <div
                  key={plan.key}
                  style={{
                    border: '1px solid #e1e3e5',
                    borderRadius: '8px',
                    padding: '20px',
                    backgroundColor: subscription?.plan === plan.key ? '#f6f8fa' : 'white'
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ margin: '0 0 8px 0' }}>{plan.name}</h3>
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                      {plan.price === 0 ? 'Free' : `$${plan.price}/month`}
                    </p>
                  </div>
                  
                  <p style={{ color: '#666', marginBottom: '12px' }}>
                    {plan.credits === -1 ? 'Unlimited try-ons' : `${plan.credits} try-ons/month`}
                  </p>
                  
                  <ul style={{ listStyle: 'none', padding: 0, marginBottom: '16px' }}>
                    {plan.features.map((feature, index) => (
                      <li key={index} style={{ marginBottom: '8px', color: '#666' }}>
                        • {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {subscription?.plan !== plan.key ? (
                    <button
                      onClick={() => handleUpgradePlan(plan.key)}
                      disabled={billingFetcher.state === 'submitting'}
                      style={{
                        backgroundColor: plan.price === 0 ? '#fff' : '#000',
                        color: plan.price === 0 ? '#000' : '#fff',
                        border: plan.price === 0 ? '1px solid #000' : 'none',
                        padding: '12px 24px',
                        borderRadius: '4px',
                        cursor: billingFetcher.state === 'submitting' ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        width: '100%'
                      }}
                    >
                      {billingFetcher.state === 'submitting' ? 'Loading...' : 
                       subscription?.plan === 'FREE' && plan.price > 0 ? 'Upgrade' : 
                       subscription?.plan !== 'FREE' && plan.price > (subscription?.price || 0) ? 'Upgrade' :
                       subscription?.plan !== 'FREE' && plan.price < (subscription?.price || 0) ? 'Downgrade' :
                       'Select'}
                    </button>
                  ) : (
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#d4edda', 
                      color: '#155724',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontWeight: '600'
                    }}>
                      Current Plan
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
