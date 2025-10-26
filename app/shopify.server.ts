import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

// Auto-detect app URL from Vercel environment
const getAppUrl = () => {
  // If explicitly set, use that
  if (process.env.SHOPIFY_APP_URL) {
    return process.env.SHOPIFY_APP_URL;
  }
  
  // Auto-detect from Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Fallback for local development
  return process.env.HOST || "http://localhost:3000";
};

// Parse explicit custom domain allow/mapping list for safer handling
function parseCustomDomains(): string[] {
  const single = process.env.SHOP_CUSTOM_DOMAIN;
  const csv = process.env.SHOP_CUSTOM_DOMAINS; // comma-separated list
  const mapCsv = process.env.SHOP_DOMAIN_MAP; // format: custom=shop.myshopify.com,custom2=shop2.myshopify.com
  const fromMap = (mapCsv || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.split("=")[0]?.trim())
    .filter(Boolean) as string[];
  const list = [single, ...(csv ? csv.split(",") : []), ...fromMap]
    .filter(Boolean)
    .map((d) => d!.toLowerCase());
  return Array.from(new Set(list));
}

// Lazy initialization to avoid DB connections on non-authenticated routes
let shopify: ReturnType<typeof shopifyApp> | undefined;

function getShopify() {
  if (!shopify) {
    shopify = shopifyApp({
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
      apiVersion: ApiVersion.October25,
      scopes: process.env.SCOPES?.split(","),
      appUrl: getAppUrl(),
      authPathPrefix: "/auth",
      sessionStorage: new PrismaSessionStorage(prisma),
      distribution: AppDistribution.AppStore,
      ...(parseCustomDomains().length
        ? { customShopDomains: parseCustomDomains() }
        : {}),
    });
  }
  return shopify;
}

// Type helper for shopify app return type
type ShopifyApp = ReturnType<typeof shopifyApp>;

export default getShopify;
export const apiVersion = ApiVersion.October25;

// Lazy getters for Shopify app methods
export const addDocumentResponseHeaders = (request: Request, headers: Headers) => 
  getShopify().addDocumentResponseHeaders(request, headers);

// Create proxies that lazily access the Shopify app properties
export const authenticate = new Proxy({} as ShopifyApp['authenticate'], {
  get: (_target, prop) => {
    const shopifyInstance = getShopify();
    const value = shopifyInstance.authenticate[prop as keyof ShopifyApp['authenticate']];
    return typeof value === 'function' ? value.bind(shopifyInstance.authenticate) : value;
  }
});

export const unauthenticated = new Proxy({} as ShopifyApp['unauthenticated'], {
  get: (_target, prop) => {
    const shopifyInstance = getShopify();
    const value = shopifyInstance.unauthenticated[prop as keyof ShopifyApp['unauthenticated']];
    return typeof value === 'function' ? value.bind(shopifyInstance.unauthenticated) : value;
  }
});

export const login = new Proxy({} as ShopifyApp['login'], {
  get: (_target, prop) => {
    const shopifyInstance = getShopify();
    const value = shopifyInstance.login[prop as keyof ShopifyApp['login']];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof value === 'function' ? (value as any).bind(shopifyInstance.login) : value;
  }
});

export const registerWebhooks = new Proxy({} as ShopifyApp['registerWebhooks'], {
  get: (_target, prop) => {
    const shopifyInstance = getShopify();
    const value = shopifyInstance.registerWebhooks[prop as keyof ShopifyApp['registerWebhooks']];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof value === 'function' ? (value as any).bind(shopifyInstance.registerWebhooks) : value;
  }
});

export const sessionStorage = new Proxy({} as ShopifyApp['sessionStorage'], {
  get: (_target, prop) => {
    const shopifyInstance = getShopify();
    const value = shopifyInstance.sessionStorage[prop as keyof ShopifyApp['sessionStorage']];
    return typeof value === 'function' ? value.bind(shopifyInstance.sessionStorage) : value;
  }
});
