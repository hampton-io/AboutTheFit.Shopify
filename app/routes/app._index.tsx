import { useEffect, useState } from 'react';
import type { LoaderFunctionArgs, HeadersFunction } from 'react-router';
import { useLoaderData, useFetcher } from 'react-router';
import { authenticate } from '../shopify.server';
import { boundary } from '@shopify/shopify-app-react-router/server';
import { useAppBridge } from '@shopify/app-bridge-react';
// Inline plans data to avoid SSR issues
const PLANS = {
  FREE: {
    name: "Trial",
    price: 0,
    annualPrice: 0,
    credits: 50,
    productLimit: 3,
    trialDays: 0,
    features: ["Up to 3 products", "Basic virtual try-on"],
  },
  SIDE_HUSSL: {
    name: "SIde Hussle",
    price: 9.99,
    annualPrice: 99.99,
    credits: 500,
    productLimit: 100,
    trialDays: 7,
    features: ["Up to 100 products", "Priority support", "Advanced features"],
  },
  BUSINESS: {
    name: "Business",
    price: 39.0,
    annualPrice: 390.0,
    credits: 10000,
    productLimit: -1, // -1 represents unlimited
    trialDays: 14,
    features: ["Unlimited products", "Priority support", "Analytics dashboard"],
  },
  ALL_IN: {
    name: "All In",
    price: 99.0,
    annualPrice: 990.0,
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

// Helper function to convert Shopify billing interval to display text
function getIntervalDisplay(interval?: string | null): { short: string; long: string } {
  if (!interval) {
    return { short: '/month', long: 'Billed monthly' };
  }
  
  switch (interval) {
    case 'ANNUAL':
    case 'YEARLY':
    case 'EVERY_365_DAYS':
      return { short: '/year', long: 'Billed annually' };
    case 'EVERY_30_DAYS':
    case 'MONTHLY':
    default:
      return { short: '/month', long: 'Billed monthly' };
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return {
    setupGuideVideoUrl: process.env.SETUP_GUIDE_VIDEO_URL || null,
  };
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
  blockAddedToTheme?: boolean;
}

interface Subscription {
  isActive: boolean;
  plan: PlanKey;
  planName: string;
  createdAt: string | null;
  price: number;
  interval?: string | null;
}

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
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
    } else if (productsFetcher.data && !productsFetcher.data.success) {
      // Handle error case
      console.error('Failed to load products:', productsFetcher.data);
      setProducts([]);
      setIsLoading(false);
    }
  }, [productsFetcher.data]);

  // Update stats when fetcher returns
  useEffect(() => {
    if (statsFetcher.data?.success) {
      setStats(statsFetcher.data.stats);
      setIsLoading(false);
    } else if (statsFetcher.data && !statsFetcher.data.success) {
      // Handle error case - show default stats to prevent infinite loading
      console.error('Failed to load stats:', statsFetcher.data);
      setStats({
        totalProducts: 0,
        productsWithTryOn: 0,
        totalTryOns: 0,
        creditsUsed: 0,
        creditsRemaining: 0,
        creditsLimit: 0,
        productLimit: 0,
        daysUntilReset: 0,
        blockAddedToTheme: false,
      });
      setIsLoading(false);
    }
  }, [statsFetcher.data, statsFetcher.state]);

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
    if (billingFetcher.data?.success && billingFetcher.state === 'idle') {
      if (billingFetcher.data.confirmationUrl) {
        window.location.href = billingFetcher.data.confirmationUrl;
      } else if (billingFetcher.data.message && showBillingModal) {
        // Success without confirmation URL (development mode) - only if modal is open
        shopify.toast.show(billingFetcher.data.message);
        setShowBillingModal(false);
        // Reload subscription status and stats
        setTimeout(() => {
          billingFetcher.load('/api/billing/status');
          statsFetcher.load('/api/admin/stats');
        }, 100);
      }
    } else if (billingFetcher.data?.error) {
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
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
      
      <s-page heading="About the Fit - Virtual Try-On">
        {/* Stats Cards - Reserve space to prevent layout shift */}
        <s-section>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            minHeight: stats ? 'auto' : '400px', // Reserve space while loading
          }}
        >
          {!stats ? (
            // Skeleton loaders with exact dimensions
            <>
              {[1, 2, 3, 4].map((i) => (
                <s-box key={i} padding="base" borderWidth="base" borderRadius="base">
                  <s-stack direction="block" gap="base">
                    <div style={{ 
                      height: '20px', 
                      width: '60%', 
                      backgroundColor: '#E5E7EB',
                      borderRadius: '4px',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                    <div style={{ 
                      height: '40px', 
                      width: '40%', 
                      backgroundColor: '#E5E7EB',
                      borderRadius: '4px',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                    <div style={{ 
                      height: '16px', 
                      width: '80%', 
                      backgroundColor: '#E5E7EB',
                      borderRadius: '4px',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                  </s-stack>
                </s-box>
              ))}
            </>
          ) : (
            <>
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
                        {(subscription.interval === 'ANNUAL' || subscription.interval === 'YEARLY' || subscription.interval === 'EVERY_365_DAYS') ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                              <div style={{ fontSize: '28px', fontWeight: '700', lineHeight: '1' }}>
                                ${subscription.price}
                              </div>
                              <s-text tone="neutral">/year</s-text>
                            </div>
                            <s-text tone="neutral">
                              ${(subscription.price / 12).toFixed(2)}/month when billed annually
                            </s-text>
                            <s-text tone="success">
                              <strong>✓ Billed annually</strong>
                            </s-text>
                            {subscription.plan && PLANS[subscription.plan] && (
                              <s-text tone="success">
                                You're saving ${(PLANS[subscription.plan].price * 12 - subscription.price).toFixed(2)} per year!
                              </s-text>
                            )}
                          </>
                        ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <div style={{ fontSize: '28px', fontWeight: '700', lineHeight: '1' }}>
                            ${subscription.price}
                          </div>
                          <s-text tone="neutral">{getIntervalDisplay(subscription.interval).short}</s-text>
                        </div>
                        <s-text tone="neutral">{getIntervalDisplay(subscription.interval).long}</s-text>
                          </>
                        )}
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
                    <div style={{ 
                      marginTop: '8px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px',
                      minHeight: '88px' // Reserve space for both buttons (40px + 40px + 8px gap)
                    }}>
                      <s-button
                        variant="primary"
                        onClick={() => {
                          setShowBillingModal(true);
                        }}
                        disabled={billingFetcher.state === 'submitting'}
                      >
                        {billingFetcher.state === 'submitting' ? 'Loading...' : subscription.price > 0 ? 'Change Plan' : 'Upgrade Plan'}
                      </s-button>
                      {/* Always render, but hide when not needed - prevents layout shift */}
                      <div style={{ 
                        opacity: subscription.price > 0 ? 1 : 0,
                        pointerEvents: subscription.price > 0 ? 'auto' : 'none',
                        minHeight: '40px' // Fixed height to reserve space
                      }}>
                        {subscription.price > 0 ? (
                          <s-button
                            variant="secondary"
                            onClick={handleCancelSubscription}
                            disabled={billingCancelFetcher.state === 'submitting'}
                          >
                            {billingCancelFetcher.state === 'submitting' ? 'Cancelling...' : 'Cancel Subscription'}
                          </s-button>
                        ) : (
                          <div style={{ height: '40px' }} />
                        )}
                      </div>
                    </div>
                  </>
                )}
              </s-stack>
            </s-box>
            </>
          )}
          </div>
        </s-section>

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

      {stats && stats.productLimit !== -1 && stats.productsWithTryOn > 0 && stats.productsWithTryOn >= stats.productLimit && (
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
            <s-stack direction="block" gap="base">
              {/* Skeleton loaders matching product card height */}
              {[1, 2, 3].map((i) => (
                <s-box key={i} padding="base" borderWidth="base" borderRadius="base">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px',
                    minHeight: '76px' // Match actual product card height
                  }}>
                    <div style={{ 
                      width: '60px', 
                      height: '60px', 
                      backgroundColor: '#E5E7EB',
                      borderRadius: '8px',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        height: '24px', 
                        width: '70%', 
                        backgroundColor: '#E5E7EB',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }} />
                      <div style={{ 
                        height: '16px', 
                        width: '40%', 
                        backgroundColor: '#E5E7EB',
                        borderRadius: '4px',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }} />
                    </div>
                    <div style={{ 
                      width: '80px', 
                      height: '32px', 
                      backgroundColor: '#E5E7EB',
                      borderRadius: '16px',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                  </div>
                </s-box>
              ))}
            </s-stack>
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
                        width="60"
                        height="60"
                        loading="lazy"
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
                        accessibilityLabel={`Toggle virtual try-on for ${product.title}`}
                      />
                    </div>
                  </div>
                </s-box>
              ))}
            </s-stack>
          )}
        </s-stack>
      </s-section>

      {/* Setup Guide - Always show with skeleton */}
      <s-section slot="aside" heading={
        !stats ? "Loading..." :
        stats.totalTryOns > 0 ? "All systems go! 🎉" : 
        stats.productsWithTryOn === 0 ? "Getting Started" : 
        "Complete Your Setup"
      }>
        {!stats ? (
          // Skeleton loader for setup guide
          <s-stack direction="block" gap="base">
            <div style={{ 
              height: '40px', 
              width: '100%', 
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ 
                height: '80px', 
                width: '100%', 
                backgroundColor: '#E5E7EB',
                borderRadius: '8px',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`
              }} />
            ))}
          </s-stack>
        ) : (
          <s-stack direction="block" gap="base">
            {stats.totalTryOns > 0 ? (
              <s-paragraph>
                <strong>Everything is working.</strong> Your virtual try-on is live and customers can try on products before buying.
              </s-paragraph>
            ) : stats.productsWithTryOn === 0 ? (
              <s-paragraph>
                <strong>Welcome!</strong> Let customers virtually try on your products before buying.
              </s-paragraph>
            ) : (
              <s-paragraph>
                You've enabled {stats.productsWithTryOn} {stats.productsWithTryOn === 1 ? 'product' : 'products'}. Almost there!
              </s-paragraph>
            )}
            
            {loaderData?.setupGuideVideoUrl && stats.totalTryOns === 0 && (
              <div style={{ marginBottom: '12px' }}>
                <a 
                  href={loaderData.setupGuideVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    backgroundColor: '#FF0000',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontWeight: '600',
                    fontSize: '14px',
                    border: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                    minWidth: '200px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#CC0000';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.16)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FF0000';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.12)';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.615 5.481a2.516 2.516 0 0 0-1.771-1.782C16.274 3.333 10 3.333 10 3.333s-6.274 0-7.844.366A2.516 2.516 0 0 0 .385 5.481C0 7.056 0 10.334 0 10.334s0 3.277.385 4.852a2.516 2.516 0 0 0 1.771 1.782c1.57.367 7.844.367 7.844.367s6.274 0 7.844-.367a2.516 2.516 0 0 0 1.771-1.782c.385-1.575.385-4.852.385-4.852s0-3.278-.385-4.853z" fill="white"/>
                    <path d="M8 13.167V7.5l5.333 2.834L8 13.167z" fill="#FF0000"/>
                  </svg>
                  Watch setup guide
                </a>
              </div>
            )}
            
            {/* Step 1: Enable Products */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              padding: '12px',
              backgroundColor: stats.productsWithTryOn > 0 ? '#F0FDF4' : '#F9FAFB',
              borderRadius: '8px',
              border: stats.productsWithTryOn > 0 ? '2px solid #10B981' : '2px solid #E5E7EB'
            }}>
              <div style={{ fontSize: '20px', flexShrink: 0 }}>
                {stats.productsWithTryOn > 0 ? '✅' : '1️⃣'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  Enable products
                </div>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>
                  {stats.productsWithTryOn > 0 
                    ? `${stats.productsWithTryOn} ${stats.productsWithTryOn === 1 ? 'product' : 'products'} enabled`
                    : 'Enable try-on for products below'}
                </div>
              </div>
            </div>
            
            {/* Step 2: Add to Theme */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              padding: '12px',
              backgroundColor: stats.blockAddedToTheme ? '#F0FDF4' : '#F9FAFB',
              borderRadius: '8px',
              border: stats.blockAddedToTheme ? '2px solid #10B981' : '2px solid #E5E7EB'
            }}>
              <div style={{ fontSize: '20px', flexShrink: 0 }}>
                {stats.blockAddedToTheme ? '✅' : '2️⃣'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  Add button to theme
                </div>
                {stats.blockAddedToTheme ? (
                  <div style={{ 
                    fontSize: '14px',
                    color: '#059669',
                    fontWeight: '600'
                  }}>
                    Block added successfully!
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                    • Go to <strong>Online Store → Themes</strong><br/>
                    • Click <strong>Customize</strong><br/>
                    • Open a <strong>Product page</strong><br/>
                    • Add <strong>"About the Fit - Try It On"</strong> block
                  </div>
                )}
              </div>
            </div>
            
            {/* Step 3: First Try-On */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              padding: '12px',
              backgroundColor: stats.totalTryOns > 0 ? '#F0FDF4' : '#F9FAFB',
              borderRadius: '8px',
              border: stats.totalTryOns > 0 ? '2px solid #10B981' : '2px solid #E5E7EB'
            }}>
              <div style={{ fontSize: '20px', flexShrink: 0 }}>
                {stats.totalTryOns > 0 ? '✅' : '3️⃣'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  Get your first try-on
                </div>
                {stats.totalTryOns > 0 ? (
                  <div style={{ 
                    fontSize: '14px',
                    color: '#059669',
                    fontWeight: '600'
                  }}>
                    {stats.totalTryOns} try-on{stats.totalTryOns !== 1 ? 's' : ''} generated!
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', color: '#6B7280' }}>
                    We are waiting for your first try-on.
                  </div>
                )}
              </div>
            </div>
          </s-stack>
        )}
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
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {plans.map((plan) => (
                <div
                  key={plan.key}
                  style={{
                    border: subscription?.plan === plan.key ? '2px solid #008060' : '1px solid #e1e3e5',
                    borderRadius: '8px',
                    padding: '20px',
                    backgroundColor: subscription?.plan === plan.key ? '#f6f8fa' : 'white'
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ margin: '0 0 8px 0' }}>{plan.name}</h3>
                    {plan.price === 0 ? (
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                        Free
                      </p>
                    ) : (
                      <>
                        <p style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 'bold' }}>
                          ${plan.price}/month
                        </p>
                        <p style={{ margin: 0, fontSize: '16px', color: '#666' }}>
                          or ${plan.annualPrice}/year
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#008060', fontWeight: '600' }}>
                          Save ${((plan.price * 12) - plan.annualPrice).toFixed(2)} with annual billing
                        </p>
                      </>
                    )}
                  </div>
                  
                  <p style={{ color: '#666', marginBottom: '12px', paddingTop: '8px', borderTop: '1px solid #e1e3e5' }}>
                    {plan.credits === -1 ? 'Unlimited try-ons' : `${plan.credits} try-ons/month`}
                  </p>
                  
                  <ul style={{ listStyle: 'none', padding: 0, marginBottom: '16px' }}>
                    {plan.features.map((feature, index) => (
                      <li key={index} style={{ marginBottom: '8px', color: '#666' }}>
                        • {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {subscription?.plan === plan.key && (
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#d4edda', 
                      color: '#155724',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontWeight: '600'
                    }}>
                      ✓ Current Plan
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <button
              onClick={() => {
                window.open('https://admin.shopify.com/charges/aboutthefit/pricing_plans', '_top');
                setShowBillingModal(false);
              }}
              style={{
                backgroundColor: '#008060',
                color: 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                width: '100%',
                marginTop: '8px'
              }}
            >
              Change Subscription
            </button>
          </div>
        </div>
      )}
      </s-page>
    </>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
