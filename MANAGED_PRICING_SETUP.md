# Managed Pricing Setup Guide

## What is Managed Pricing?

**Managed Pricing** is a Shopify feature where:
- ✅ You configure pricing plans in the Partner Dashboard
- ✅ Shopify handles the billing UI and payment collection
- ✅ Merchants manage subscriptions through their Shopify Admin
- ❌ You **cannot** create/modify subscriptions via GraphQL Billing API

## How Your App Now Works With Managed Pricing

### 1. **Subscription Sync System**
Your app automatically syncs subscription status from Shopify:

```typescript
// Called when loading billing status
await syncSubscriptionFromShopify(request);
```

**What it does:**
1. Reads the active subscription from Shopify
2. Maps the subscription name to your plan (FREE, SIDE_HUSSL, BUSINESS, ALL_IN)
3. Updates your database with correct `creditsLimit` and `productLimit`
4. Sets entitlements automatically

### 2. **UI Changes**
- **"Upgrade Plan" button** → Shows toast message directing users to Shopify Admin
- **Billing modal** → Displays info banner explaining how to change plans
- **No API calls** → Doesn't try to create subscriptions (which would fail)

### 3. **How Users Change Plans**

**Merchant Flow:**
1. Merchant goes to **Shopify Admin → Apps → About the Fit**
2. Clicks **"Manage app"** or **"Change pricing plan"**
3. Selects a plan from your configured options
4. Shopify handles payment
5. Next time they open your app, it syncs automatically ✅

### 4. **Your Partner Dashboard Setup**

In Shopify Partner Dashboard, configure these pricing plans to match your code:

| Plan Name | Price | Description |
|-----------|-------|-------------|
| **Free Plan** | $0/month | 50 try-ons, 3 products |
| **Side Hussle** | $9.99/month | 500 try-ons, 100 products |
| **Business** | $39/month | 10,000 try-ons, unlimited products |
| **All In** | $99/month | Unlimited try-ons, unlimited products |

**Important:** The plan names in Partner Dashboard **must match** the names in your `PLANS` constant:
```typescript
const PLANS = {
  FREE: { name: "Free Plan", ... },
  SIDE_HUSSL: { name: "Side Hussle", ... },
  BUSINESS: { name: "Business", ... },
  ALL_IN: { name: "All In", ... },
}
```

## How It Works Behind The Scenes

### When App Loads:
```
1. User opens app
2. App calls /api/billing/status
3. syncSubscriptionFromShopify() runs
4. Reads Shopify subscription via GraphQL (READ is allowed!)
5. Maps plan name → plan key
6. Updates database with creditsLimit & productLimit
7. Returns subscription status to UI
8. User sees their correct plan and limits ✅
```

### When User Tries To Enable A Product:
```
1. User toggles product ON
2. App checks: hasProductLimitsExceeded(shop)
3. Reads productLimit from database (set by sync)
4. If within limit → Enable product ✅
5. If over limit → Show "Upgrade your plan" message ❌
```

### When User Clicks "Upgrade Plan":
```
1. Shows modal with plan options
2. User clicks a plan button
3. Toast message: "Go to Shopify Admin to change plans"
4. User goes to Shopify Admin
5. Changes plan through Shopify's interface
6. Returns to app
7. Sync runs → Database updated with new limits ✅
```

## Files Modified

### Backend:
- ✅ `app/services/billing.server.ts`
  - Added `syncSubscriptionFromShopify()` function
  - Reads subscription from Shopify
  - Updates database with entitlements

- ✅ `app/routes/api.billing.status.tsx`
  - Calls sync before returning status
  - Ensures data is always up-to-date

### Frontend:
- ✅ `app/routes/app._index.tsx`
  - Updated `handleUpgradePlan()` to show toast message
  - Added info banner in billing modal
  - No longer calls API to create subscriptions

## Environment Variables

Optional - explicitly mark as managed pricing:
```bash
SHOPIFY_MANAGED_PRICING=true
```

## Advantages of Managed Pricing

✅ **Shopify handles billing UI** - Less code to maintain  
✅ **Compliant with app store** - Required for some apps  
✅ **Better merchant trust** - Familiar Shopify interface  
✅ **Automatic payment handling** - Shopify collects payments  
✅ **Built-in dunning** - Shopify handles failed payments  

## Testing

### 1. Deploy Changes
```bash
git add .
git commit -m "Add managed pricing support with subscription sync"
git push
```

### 2. Configure Plans in Partner Dashboard
1. Go to Partner Dashboard → Your App → Pricing
2. Enable Managed Pricing
3. Add 4 pricing plans (matching the names above)
4. Save

### 3. Test The Flow
1. Install app in a dev store
2. Open app → Should show "Free Plan"
3. Go to Shopify Admin → Apps → Your App
4. Click "Change pricing plan"
5. Select "Side Hussle" plan
6. Return to app
7. Refresh → Should show "Side Hussle" with 100 product limit ✅

### 4. Test Product Limits
1. Try enabling products
2. Should respect the productLimit from your plan
3. At limit → Should show upgrade message

## Troubleshooting

### Plan names don't match?
**Error:** Sync can't find plan key  
**Fix:** Ensure Partner Dashboard plan names **exactly match** your `PLANS.name` values

### Sync not working?
**Error:** Database not updating  
**Fix:** Check logs for "🔄 Syncing subscription from Shopify"  
**Debug:** Run `/api/billing/status` and check console

### Still seeing "Managed Pricing" errors?
**Cause:** Old code trying to create subscriptions  
**Fix:** Ensure `handleUpgradePlan()` just shows toast message (doesn't call API)

## Migration from API Billing

If you previously used API-based billing:

1. ✅ Sync function will read existing subscriptions
2. ✅ Database will be updated with correct limits
3. ✅ Users won't lose their current plans
4. ⚠️ Future upgrades must go through Shopify Admin

## Benefits for Your App

1. **Works correctly with Managed Pricing** ✅
2. **Database stays in sync** with Shopify subscriptions
3. **Product limits enforced** properly
4. **Monthly resets work** as expected
5. **User-friendly** - clear instructions on how to change plans

Your app is now fully compatible with Shopify's Managed Pricing system! 🎉

