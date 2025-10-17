import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR Compliance Webhook: Shop Data Deletion (Redaction)
 * 
 * Triggered 48 hours after a store uninstalls your app.
 * We must delete all data associated with this shop.
 * 
 * For About The Fit:
 * - Delete all try-on requests for this shop
 * - Delete shop metadata and subscription info
 * - Delete product settings
 * - Clean up any sessions or temporary data
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`🏪🗑️ Received ${topic} webhook for ${shop}`);
    console.log("Shop redact payload:", payload);

    const shopDomain = payload.shop_domain;
    const shopId = payload.shop_id;

    console.log(`Shop deletion request for shop ${shopDomain} (ID: ${shopId})`);

    // Delete all data associated with this shop
    // This is triggered 48 hours after app uninstallation

    // 1. Delete all try-on requests
    const deletedRequests = await db.tryOnRequest.deleteMany({
      where: { shop: shop },
    });
    console.log(`Deleted ${deletedRequests.count} try-on requests`);

    // 2. Delete app metadata (subscription info, credits, etc.)
    const deletedMetadata = await db.appMetadata.deleteMany({
      where: { shop: shop },
    });
    console.log(`Deleted ${deletedMetadata.count} app metadata records`);

    // 3. Delete product settings
    const deletedProductSettings = await db.productTryOnSettings.deleteMany({
      where: { shop: shop },
    });
    console.log(`Deleted ${deletedProductSettings.count} product settings`);

    // 4. Delete any remaining sessions
    const deletedSessions = await db.session.deleteMany({
      where: { shop: shop },
    });
    console.log(`Deleted ${deletedSessions.count} sessions`);

    const totalDeleted = 
      deletedRequests.count + 
      deletedMetadata.count + 
      deletedProductSettings.count + 
      deletedSessions.count;

    console.log("Shop data redaction completed:", {
      shopDomain,
      shopId,
      totalRecordsDeleted: totalDeleted,
      breakdown: {
        tryOnRequests: deletedRequests.count,
        metadata: deletedMetadata.count,
        productSettings: deletedProductSettings.count,
        sessions: deletedSessions.count,
      },
    });

    // In a production app, you would also:
    // 1. Delete any files stored in cloud storage
    // 2. Remove shop data from any analytics platforms
    // 3. Purge shop data from backups (within retention period)
    // 4. Log the deletion for audit purposes

    return new Response(JSON.stringify({ 
      success: true,
      message: "Shop data redacted successfully",
      totalRecordsDeleted: totalDeleted,
      breakdown: {
        tryOnRequests: deletedRequests.count,
        metadata: deletedMetadata.count,
        productSettings: deletedProductSettings.count,
        sessions: deletedSessions.count,
      },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing shop redact webhook:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to process shop redaction" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

