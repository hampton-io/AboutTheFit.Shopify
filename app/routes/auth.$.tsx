
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log('[Auth] OAuth callback received');
  const startTime = Date.now();
  
  try {
    const { session } = await authenticate.admin(request);
    console.log('[Auth] Authentication completed in', Date.now() - startTime, 'ms for shop:', session.shop);
    
    // Create app metadata on first install/auth
    // This ensures stats page doesn't break on fresh installs
    try {
      const result = await prisma.appMetadata.upsert({
        where: { shop: session.shop },
        create: {
          shop: session.shop,
          creditsUsed: 0,
          creditsLimit: 10, // Free tier: 10 try-ons per month
          productLimit: 3,  // Free tier: 3 products max
          isActive: true,
        },
        update: {
          // Don't overwrite existing data, just ensure row exists
          isActive: true,
        },
      });
      console.log('[Auth] ✅ AppMetadata ensured for shop:', session.shop, 'in', Date.now() - startTime, 'ms');
      console.log('[Auth] Metadata result:', result);
    } catch (error) {
      console.error('[Auth] ❌ Failed to create metadata:', error);
      console.error('[Auth] Error details:', error instanceof Error ? error.stack : error);
      // Don't fail auth if metadata creation fails
    }

    console.log('[Auth] ✅ Auth flow completed in', Date.now() - startTime, 'ms');
    return null;
  } catch (error) {
    console.error('[Auth] ❌ Authentication failed:', error);
    throw error;
  }
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
