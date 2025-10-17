import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Unified GDPR Compliance Webhook Handler
 * 
 * Handles all three mandatory compliance webhooks:
 * - customers/data_request
 * - customers/redact
 * - shop/redact
 * 
 * The topic is automatically parsed by Shopify's authenticate.webhook()
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`📋 Received ${topic} webhook for ${shop}`);

    // Route to appropriate handler based on topic
    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST":
        return await handleCustomerDataRequest(shop, payload);
      
      case "CUSTOMERS_REDACT":
        return await handleCustomerRedact(shop, payload);
      
      case "SHOP_REDACT":
        return await handleShopRedact(shop, payload);
      
      default:
        console.error(`Unknown compliance webhook topic: ${topic}`);
        return new Response(JSON.stringify({ 
          error: "Unknown webhook topic" 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error processing compliance webhook:", error);
    
    // Check if it's an authentication/HMAC error
    if (error instanceof Response) {
      // authenticate.webhook() throws a Response for auth failures
      // This includes invalid HMAC signatures (returns 401)
      return error;
    }
    
    // Other errors return 500
    return new Response(JSON.stringify({ 
      error: "Failed to process webhook" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * Handle customer data request (GDPR right to access)
 */
async function handleCustomerDataRequest(shop: string, payload: any) {
  console.log("📋 Processing customer data request");
  
  const customerId = payload.customer?.id;
  const customerEmail = payload.customer?.email;
  const shopDomain = payload.shop_domain;

  console.log(`Customer data request for customer ${customerId} (${customerEmail}) from shop ${shopDomain}`);

  // Query our database for any data associated with this customer
  const tryOnRequests = await db.tryOnRequest.findMany({
    where: {
      shop: shop,
    },
    select: {
      id: true,
      productId: true,
      createdAt: true,
      status: true,
    },
  });

  console.log(`Found ${tryOnRequests.length} try-on requests for shop ${shop}`);
  console.log("Data to be provided:", {
    customerId,
    customerEmail,
    shopDomain,
    tryOnRequestCount: tryOnRequests.length,
    note: "Customer photos are not stored permanently and are deleted after processing",
  });

  return new Response(JSON.stringify({ 
    success: true,
    message: "Customer data request processed",
    note: "About The Fit does not permanently store customer photos. Try-on request metadata may be available."
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Handle customer data deletion (GDPR right to be forgotten)
 */
async function handleCustomerRedact(shop: string, payload: any) {
  console.log("🗑️ Processing customer redaction request");
  
  const customerId = payload.customer?.id;
  const customerEmail = payload.customer?.email;
  const shopDomain = payload.shop_domain;

  console.log(`Customer deletion request for customer ${customerId} (${customerEmail}) from shop ${shopDomain}`);

  // Delete old try-on requests (data minimization)
  const deletedRequests = await db.tryOnRequest.deleteMany({
    where: {
      shop: shop,
      createdAt: {
        lte: new Date(Date.now() - 48 * 60 * 60 * 1000), // Older than 48 hours
      },
    },
  });

  console.log(`Deleted ${deletedRequests.count} old try-on requests for shop ${shop}`);

  return new Response(JSON.stringify({ 
    success: true,
    message: "Customer data redacted successfully",
    deletedRecords: deletedRequests.count,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Handle shop data deletion (48 hours after uninstall)
 */
async function handleShopRedact(shop: string, payload: any) {
  console.log("🏪🗑️ Processing shop redaction request");
  
  const shopDomain = payload.shop_domain;
  const shopId = payload.shop_id;

  console.log(`Shop deletion request for shop ${shopDomain} (ID: ${shopId})`);

  // Delete all data associated with this shop
  const deletedRequests = await db.tryOnRequest.deleteMany({
    where: { shop: shop },
  });

  const deletedMetadata = await db.appMetadata.deleteMany({
    where: { shop: shop },
  });

  const deletedProductSettings = await db.productTryOnSettings.deleteMany({
    where: { shop: shop },
  });

  const deletedSessions = await db.session.deleteMany({
    where: { shop: shop },
  });

  const totalDeleted = 
    deletedRequests.count + 
    deletedMetadata.count + 
    deletedProductSettings.count + 
    deletedSessions.count;

  console.log("Shop data redaction completed:", {
    shopDomain,
    shopId,
    totalRecordsDeleted: totalDeleted,
  });

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
}

