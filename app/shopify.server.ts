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

const shopify = shopifyApp({
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

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
