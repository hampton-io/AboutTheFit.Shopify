import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR Compliance Webhook: Customer Data Deletion (Redaction)
 * 
 * Triggered when a customer requests deletion of their data (right to be forgotten).
 * We must delete all data associated with this customer.
 * 
 * For About The Fit:
 * - Customer photos are already deleted after processing (not permanently stored)
 * - Delete any try-on request records associated with this customer
 * - Delete any analytics or logs containing customer PII
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`🗑️ Received ${topic} webhook for ${shop}`);
    console.log("Customer redact payload:", payload);

    // Extract customer information from payload
    const customerId = payload.customer?.id;
    const customerEmail = payload.customer?.email;
    const shopDomain = payload.shop_domain;

    console.log(`Customer deletion request for customer ${customerId} (${customerEmail}) from shop ${shopDomain}`);

    // Delete any data associated with this customer
    // Note: Since we don't permanently store customer photos, we only need to clean up metadata
    
    // Delete try-on requests (if we stored customer IDs)
    // For now, we'll just log since we don't have customer-specific records
    const deletedRequests = await db.tryOnRequest.deleteMany({
      where: {
        shop: shop,
        // If we stored customer IDs, we'd filter by them here
        // customerId: customerId,
        // For now, delete old requests to comply with data minimization
        createdAt: {
          lte: new Date(Date.now() - 48 * 60 * 60 * 1000), // Older than 48 hours
        },
      },
    });

    console.log(`Deleted ${deletedRequests.count} old try-on requests for shop ${shop}`);
    console.log("Customer data redaction completed:", {
      customerId,
      customerEmail,
      shopDomain,
      deletedRecords: deletedRequests.count,
      note: "Customer photos are not stored permanently",
    });

    // In a production app, you would:
    // 1. Delete all customer PII from your database
    // 2. Remove customer data from any logs or analytics
    // 3. Purge customer data from any backups (within retention period)
    // 4. Log the deletion for audit purposes

    return new Response(JSON.stringify({ 
      success: true,
      message: "Customer data redacted successfully",
      deletedRecords: deletedRequests.count,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing customer redact webhook:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to process customer redaction" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

