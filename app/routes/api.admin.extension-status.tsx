import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * Check if the "Try It On" theme app extension is installed in the merchant's theme
 * Uses Shopify's GraphQL API to check theme app extension status
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);

    // Query to check if our app extension is installed in any themes
    const response = await admin.graphql(
      `#graphql
      query GetAppInstallation {
        currentAppInstallation {
          id
          activeSubscriptions {
            id
            name
            status
          }
        }
        app {
          id
          handle
          installation {
            activeSubscriptions {
              id
              name
            }
          }
        }
      }`
    );

    const data = await response.json();

    // Additional query to check theme specifics
    const themeResponse = await admin.graphql(
      `#graphql
      query GetThemes {
        themes(first: 50) {
          edges {
            node {
              id
              name
              role
              createdAt
              updatedAt
            }
          }
        }
      }`
    );

    const themeData = await themeResponse.json();

    return Response.json({
      success: true,
      appInstallation: data.data,
      themes: themeData.data?.themes?.edges || [],
      // Note: Shopify doesn't expose detailed theme app extension block placement via API
      // Merchants still need to manually add blocks in theme editor
      warning: "Theme app extensions must be manually added by merchants in the theme editor. The API can confirm the app is installed but cannot verify block placement on specific pages.",
    });
  } catch (error) {
    console.error("Error checking extension status:", error);
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to check extension status" 
      },
      { status: 500 }
    );
  }
};

