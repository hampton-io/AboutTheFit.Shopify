import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, redirect } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

// Try to resolve a custom storefront domain to the canonical myshopify domain.
// Strategy: request /admin and inspect the final URL after redirects; Shopify
// typically redirects custom domains to https://<shop>.myshopify.com/admin/...
async function resolveCustomDomainToMyshopify(input: string): Promise<string | null> {
  try {
    const trimmed = input.trim();
    if (!trimmed) return null;
    // 1) Explicit mapping via env (SHOP_DOMAIN_MAP: custom=shop.myshopify.com,custom2=shop2.myshopify.com)
    const mapCsv = process.env.SHOP_DOMAIN_MAP || "";
    const map: Record<string, string> = {};
    for (const pair of mapCsv.split(",")) {
      const [custom, myshop] = pair.split("=").map((s) => s?.trim().toLowerCase());
      if (custom && myshop) map[custom] = myshop;
    }
    const hostOnly = trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();
    if (map[hostOnly]) return map[hostOnly];
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const base = hasProtocol ? trimmed : `https://${trimmed}`;

    // Setup a short, safe timeout for network calls
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    // Follow redirects and inspect the final URL
    const adminUrl = new URL("/admin", base).toString();
    const res = await fetch(adminUrl, { redirect: "follow", signal: controller.signal });
    const finalUrl = res.url || adminUrl;
    // Try extracting via shop= query param first (accounts.shopify.com redirect often includes it)
    const finalU = new URL(finalUrl);
    const qpShop = finalU.searchParams.get("shop");
    if (qpShop && /\.myshopify\.com$/i.test(qpShop)) return qpShop.toLowerCase();
    // Handle admin.shopify.com/store/<slug> redirects by inferring <slug>.myshopify.com
    const storeSlugMatch = finalUrl.match(/admin\.shopify\.com\/store\/([a-z0-9-]+)/i);
    if (storeSlugMatch && storeSlugMatch[1]) {
      return `${storeSlugMatch[1].toLowerCase()}.myshopify.com`;
    }
    const match = finalUrl.match(/([a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com)/i);
    if (match) return match[1].toLowerCase();

    // Fallback: fetch homepage HTML and search for the myshopify domain leak in theme scripts
    const home = await fetch(base, { redirect: "follow", signal: controller.signal });
    const html = await home.text();
    // Common patterns in Shopify themes
    const patterns = [
      /Shopify\.shop\s*=\s*['\"]([a-zA-Z0-9-]+\.myshopify\.com)['\"]/i,
      /permanent_domain\s*[:=]\s*['\"]([a-zA-Z0-9-]+\.myshopify\.com)['\"]/i,
      /([a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com)/i,
    ];
    const htmlMatch = patterns
      .map((re) => html.match(re))
      .find((m) => m && m[1]);
    clearTimeout(timeout);
    if (htmlMatch) return htmlMatch[1].toLowerCase();
  } catch {
    // Ignore; we'll surface a friendly error upstream
  }
  return null;
}

function isMyshopifyDomain(domain: string): boolean {
  return /^(?=.{3,255}$)[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/i.test(domain);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const givenShop = url.searchParams.get("shop");

  if (givenShop && !isMyshopifyDomain(givenShop)) {
    const resolved = await resolveCustomDomainToMyshopify(givenShop);
    if (resolved) {
      url.searchParams.set("shop", resolved);
      const updatedRequest = new Request(url.toString(), request);
      const loginResponse = await login(updatedRequest);
      if (loginResponse instanceof Response) return loginResponse;
      const errors = loginErrorMessage(loginResponse);
      return { errors };
    }
    // Do NOT attempt OAuth with a non-.myshopify.com domain; surface an error instead
    return { errors: { shop: "We couldn’t detect the Shopify domain for that address. Please enter your .myshopify.com domain. In Shopify admin go to Settings → Domains and copy the domain that contains .myshopify.com (e.g. your-store.myshopify.com). Or install from the Shopify App Store by searching for ‘About The Fit’." } } as any;
  }

  const loginResponse = await login(request);
  
  // If login returns a redirect (successful OAuth initiation), return it
  if (loginResponse instanceof Response) {
    return loginResponse;
  }
  
  // Otherwise, return errors to show the form
  const errors = loginErrorMessage(loginResponse);
  return { errors };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const input = (formData.get("shop") as string | null)?.trim() || "";

  if (input && !isMyshopifyDomain(input)) {
    const resolved = await resolveCustomDomainToMyshopify(input);
    if (resolved) {
      return redirect(`/auth/login?shop=${encodeURIComponent(resolved)}`);
    }
    return { errors: { shop: "Couldn’t detect the Shopify domain for that URL. Please enter your .myshopify.com domain." } } as any;
  }

  const loginResponse = await login(request);
  if (loginResponse instanceof Response) return loginResponse;
  const errors = loginErrorMessage(loginResponse);
  return { errors };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <AppProvider embedded={false}>
      <s-page>
        <Form method="post">
        <s-section heading="Log in">
          <s-text-field
            name="shop"
            label="Shop domain"
            details="example.myshopify.com"
            value={shop}
            onChange={(e) => setShop(e.currentTarget.value)}
            autocomplete="on"
            error={errors.shop}
          ></s-text-field>
          <s-button type="submit">Log in</s-button>
        </s-section>
        </Form>
      </s-page>
    </AppProvider>
  );
}
