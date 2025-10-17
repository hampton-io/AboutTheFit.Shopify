import type { AdminApiContext } from '@shopify/shopify-app-react-router/server';
import type { ProductData } from '../types/tryon';

/**
 * Fetch a single product by ID
 */
export async function getProduct(
  admin: AdminApiContext,
  productId: string
): Promise<ProductData | null> {
  try {
    const response = await admin.graphql(
      `#graphql
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          featuredImage {
            url
            altText
          }
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
        }
      }`,
      {
        variables: { id: productId },
      }
    );

    const data = await response.json();

    if (!data.data?.product) {
      return null;
    }

    const product = data.data.product;

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      featuredImage: product.featuredImage
        ? {
            id: product.featuredImage.id || '',
            url: product.featuredImage.url,
            altText: product.featuredImage.altText || undefined,
          }
        : undefined,
      images: product.images.edges.map((edge: any) => ({
        id: edge.node.id,
        url: edge.node.url,
        altText: edge.node.altText || undefined,
        width: edge.node.width,
        height: edge.node.height,
      })),
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

/**
 * Search for products with optional query
 */
export async function searchProducts(
  admin: AdminApiContext,
  options: {
    query?: string;
    first?: number;
    after?: string;
  } = {}
): Promise<{
  products: ProductData[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}> {
  try {
    const first = options.first || 20;
    const query = options.query || '';

    const response = await admin.graphql(
      `#graphql
      query searchProducts($query: String, $first: Int!, $after: String) {
        products(query: $query, first: $first, after: $after) {
          edges {
            node {
              id
              title
              handle
              featuredImage {
                url
                altText
              }
              images(first: 1) {
                edges {
                  node {
                    id
                    url
                    altText
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }`,
      {
        variables: {
          query,
          first,
          after: options.after || null,
        },
      }
    );

    const data = await response.json();

    if (!data.data?.products) {
      return { products: [], pageInfo: { hasNextPage: false, endCursor: null } };
    }

    const products = data.data.products.edges.map((edge: any) => {
      const node = edge.node;
      const featuredImage = node.featuredImage || node.images.edges[0]?.node;

      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        featuredImage: featuredImage
          ? {
              id: featuredImage.id || '',
              url: featuredImage.url,
              altText: featuredImage.altText || undefined,
            }
          : undefined,
        images: node.images.edges.map((imgEdge: any) => ({
          id: imgEdge.node.id,
          url: imgEdge.node.url,
          altText: imgEdge.node.altText || undefined,
        })),
      };
    });

    return {
      products,
      pageInfo: data.data.products.pageInfo,
    };
  } catch (error) {
    console.error('Error searching products:', error);
    return { products: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }
}

/**
 * Get products suitable for virtual try-on (with images)
 */
export async function getTryOnCompatibleProducts(
  admin: AdminApiContext,
  options: {
    first?: number;
    after?: string;
  } = {}
): Promise<{
  products: ProductData[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}> {
  // Search for products with images
  // You can customize this query to filter for specific product types (e.g., apparel)
  return searchProducts(admin, options);
}

/**
 * Validate if a product is suitable for try-on
 */
export function isProductTryOnCompatible(product: ProductData): {
  compatible: boolean;
  reason?: string;
} {
  // Check if product has images
  if (!product.featuredImage && product.images.length === 0) {
    return {
      compatible: false,
      reason: 'Product has no images',
    };
  }

  // Add more validation rules as needed
  // For example, check product tags, type, etc.

  return { compatible: true };
}

/**
 * Get primary product image URL
 */
export function getPrimaryImageUrl(product: ProductData): string | null {
  if (product.featuredImage) {
    return product.featuredImage.url;
  }

  if (product.images.length > 0) {
    return product.images[0].url;
  }

  return null;
}

/**
 * Format product for try-on (extract needed fields)
 */
export function formatProductForTryOn(product: ProductData): {
  productId: string;
  productTitle: string;
  productImage: string;
} | null {
  const imageUrl = getPrimaryImageUrl(product);

  if (!imageUrl) {
    return null;
  }

  return {
    productId: product.id,
    productTitle: product.title,
    productImage: imageUrl,
  };
}

