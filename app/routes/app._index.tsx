import { useEffect, useState } from 'react';
import type { LoaderFunctionArgs, HeadersFunction } from 'react-router';
import { useLoaderData, useFetcher } from 'react-router';
import { authenticate } from '../shopify.server';
import { boundary } from '@shopify/shopify-app-react-router/server';
import { useAppBridge } from '@shopify/app-bridge-react';

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
}

export default function Index() {
  const shopify = useAppBridge();
  const productsFetcher = useFetcher<any>();
  const statsFetcher = useFetcher<any>();
  const toggleFetcher = useFetcher<any>();

  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    productsFetcher.load('/api/admin/products?first=50');
    statsFetcher.load('/api/admin/stats');
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
    }
  }, [statsFetcher.data]);

  // Handle toggle success
  useEffect(() => {
    if (toggleFetcher.data?.success) {
      shopify.toast.show(toggleFetcher.data.message || 'Updated successfully');
      // Reload products and stats
      productsFetcher.load('/api/admin/products?first=50');
      statsFetcher.load('/api/admin/stats');
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-text>Products</s-text>
                <s-heading>{stats.totalProducts}</s-heading>
                <s-text tone="neutral">Total products in store</s-text>
              </s-stack>
            </s-box>

            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-text>Try-On Enabled</s-text>
                <s-heading>{stats.productsWithTryOn}</s-heading>
                <s-text tone="neutral">Products with try-on active</s-text>
              </s-stack>
            </s-box>

            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-text>Total Try-Ons</s-text>
                <s-heading>{stats.totalTryOns}</s-heading>
                <s-text tone="neutral">Generated this month</s-text>
              </s-stack>
            </s-box>

            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-text>Credits</s-text>
                <s-heading>{stats.creditsRemaining}</s-heading>
                <s-text tone="neutral">
                  of {stats.creditsUsed + stats.creditsRemaining} remaining
                </s-text>
              </s-stack>
            </s-box>
          </div>
        </s-section>
      )}

      {/* Product Management Section */}
      <s-section heading="Manage Products">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Enable or disable virtual try-on for individual products. When
            enabled, customers will see a &quot;Try It On&quot; button on the
            product page.
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

      <s-section slot="aside" heading="Need help?">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <s-link href="/app/additional">View analytics</s-link>
          </s-paragraph>
          <s-paragraph>
            <s-link href="mailto:support@aboutthefit.com" target="_blank">
              Contact support
            </s-link>
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
