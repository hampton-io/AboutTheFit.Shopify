import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR Compliance Webhook: Customer Data Request
 * 
 * Triggered when a customer requests to view their stored data.
 * We must provide all data we have stored about this customer.
 * 
 * For About The Fit:
 * - We don't permanently store customer photos (deleted after processing)
 * - We may have try-on request records with product IDs and timestamps
 * - No PII is stored beyond what's in the request logs
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`📋 Received ${topic} webhook for ${shop}`);
    console.log("Customer data request payload:", payload);

    // Extract customer information from payload
    const customerId = payload.customer?.id;
    const customerEmail = payload.customer?.email;
    const shopDomain = payload.shop_domain;

    console.log(`Customer data request for customer ${customerId} (${customerEmail}) from shop ${shopDomain}`);

    // Query our database for any data associated with this customer
    // Note: We currently don't store customer-specific data, but this is where you'd query it
    const tryOnRequests = await db.tryOnRequest.findMany({
      where: {
        shop: shop,
        // If we stored customer IDs, we'd filter by them here
        // customerId: customerId,
      },
      select: {
        id: true,
        productId: true,
        createdAt: true,
        status: true,
        // Don't include actual images as they should be deleted
      },
    });

    // Log the data request for compliance records
    console.log(`Found ${tryOnRequests.length} try-on requests for shop ${shop}`);
    console.log("Data to be provided:", {
      customerId,
      customerEmail,
      shopDomain,
      tryOnRequestCount: tryOnRequests.length,
      note: "Customer photos are not stored permanently and are deleted after processing",
    });

    // In a production app, you would:
    // 1. Compile all customer data
    // 2. Send it to the merchant via email or API
    // 3. Log the data request for audit purposes

    return new Response(JSON.stringify({ 
      success: true,
      message: "Customer data request processed",
      note: "About The Fit does not permanently store customer photos. Try-on request metadata may be available."
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing customer data request webhook:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to process data request" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

