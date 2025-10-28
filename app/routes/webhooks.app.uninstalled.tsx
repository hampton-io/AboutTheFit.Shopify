import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    // Clean up ALL shop-specific data on uninstall
    await Promise.all([
      // Delete all sessions for this shop
      db.session.deleteMany({ where: { shop } }),
      
      // Delete all try-on requests for this shop
      db.tryOnRequest.deleteMany({ where: { shop } }),
      
      // Delete all product settings for this shop
      db.productTryOnSettings.deleteMany({ where: { shop } }),
      
      // Delete all cached try-ons for this shop
      db.cachedTryOn.deleteMany({ where: { shop } }),
      
      // Delete app metadata for this shop
      db.appMetadata.deleteMany({ where: { shop } }),
    ]);

    console.log(`Successfully cleaned up all data for shop: ${shop}`);
  } catch (error) {
    console.error(`Error cleaning up data for shop ${shop}:`, error);
    // Still return 200 to acknowledge webhook receipt
  }

  return new Response();
};
