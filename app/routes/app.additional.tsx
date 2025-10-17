import { useEffect, useState } from 'react';
import type { LoaderFunctionArgs, HeadersFunction } from 'react-router';
import { useFetcher } from 'react-router';
import { authenticate } from '../shopify.server';
import { boundary } from '@shopify/shopify-app-react-router/server';
import { getTryOnAnalytics } from '../services/admin.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    const analytics = await getTryOnAnalytics(session.shop);
    return { success: true, analytics };
  } catch (error) {
    console.error('Error loading analytics:', error);
    return {
      success: false,
      analytics: {
        totalRequests: 0,
        completedRequests: 0,
        failedRequests: 0,
        successRate: 0,
        recentRequests: [],
        topProducts: [],
      },
    };
  }
};

interface Analytics {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  successRate: number;
  recentRequests: Array<{
    id: string;
    productTitle: string;
    status: string;
    createdAt: Date;
  }>;
  topProducts: Array<{
    productTitle: string;
    _count: { productId: number };
  }>;
}

export default function Additional() {
  const fetcher = useFetcher<any>();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    if (fetcher.data?.success) {
      setAnalytics(fetcher.data.analytics);
    }
  }, [fetcher.data]);

  // Load analytics on mount
  useEffect(() => {
    fetcher.load('/app/additional');
  }, []);

  if (!analytics) {
    return (
      <s-page heading="Analytics">
        <s-section>
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <s-spinner size="large" />
            <s-text>Loading analytics...</s-text>
          </div>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Try-On Analytics">
      <s-link slot="primary-action" href="/app">
        Back to Products
      </s-link>

      {/* Overview Stats */}
      <s-section heading="Overview">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-text>Total Requests</s-text>
              <s-heading>{analytics.totalRequests}</s-heading>
              <s-text tone="neutral">All time</s-text>
            </s-stack>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-text>Completed</s-text>
              <s-heading>{analytics.completedRequests}</s-heading>
              <s-text tone="neutral">Successfully generated</s-text>
            </s-stack>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-text>Failed</s-text>
              <s-heading>{analytics.failedRequests}</s-heading>
              <s-text tone="neutral">Errors encountered</s-text>
            </s-stack>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-text>Success Rate</s-text>
              <s-heading>{analytics.successRate}%</s-heading>
              <s-text tone="neutral">Completion rate</s-text>
            </s-stack>
          </s-box>
        </div>
      </s-section>

      {/* Top Products */}
      <s-section heading="Top Products">
        {analytics.topProducts.length === 0 ? (
          <s-box padding="base" borderRadius="base">
            <s-text>
              No try-on data yet. Enable try-on for products to see analytics.
            </s-text>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {analytics.topProducts.map((product, index) => (
              <s-box
                key={index}
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
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <strong>#{index + 1}</strong>
                  </div>
                  <div style={{ flex: 1 }}>
                    <s-stack direction="block" gap="base">
                      <s-heading>{product.productTitle}</s-heading>
                      <s-text tone="neutral">
                        {product._count.productId} try-on
                        {product._count.productId !== 1 ? 's' : ''}
                      </s-text>
                    </s-stack>
                  </div>
                </div>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      {/* Recent Activity */}
      <s-section heading="Recent Activity">
        {analytics.recentRequests.length === 0 ? (
          <s-box padding="base" borderRadius="base">
            <s-text>No recent activity</s-text>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {analytics.recentRequests.map((request) => (
              <s-box
                key={request.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <s-stack direction="block" gap="base">
                      <s-heading>{request.productTitle}</s-heading>
                      <s-text tone="neutral">
                        {new Date(request.createdAt).toLocaleString()}
                      </s-text>
                    </s-stack>
                  </div>
                  <s-badge
                    tone={
                      request.status === 'COMPLETED'
                        ? 'success'
                        : request.status === 'FAILED'
                          ? 'critical'
                          : request.status === 'PROCESSING'
                            ? 'info'
                            : 'warning'
                    }
                  >
                    {request.status}
                  </s-badge>
                </div>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      {/* Tips Section */}
      <s-section slot="aside" heading="Tips">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <strong>Boost conversions:</strong> Enable try-on for your
            best-selling products first
          </s-paragraph>
          <s-paragraph>
            <strong>Photo quality:</strong> Encourage customers to use
            well-lit, front-facing photos
          </s-paragraph>
          <s-paragraph>
            <strong>Product images:</strong> Use high-quality product photos
            for best results
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
