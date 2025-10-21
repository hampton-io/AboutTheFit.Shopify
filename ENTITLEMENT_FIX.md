# Entitlement Fix - Product Limit Issue

## Problem
When users selected a plan in production, the subscription was created but entitlements (credit limits, product limits) weren't being properly stored or validated, causing errors when enabling products.

## Root Cause
1. **Missing `productLimit` field**: The `AppMetadata` table stored `creditsLimit` but not `productLimit`
2. **On-the-fly calculation**: Product limits were calculated by matching `creditsLimit` to find the plan, which could fail or return stale data
3. **Managed Pricing conflict**: App uses Shopify Managed Pricing but code was trying to use the GraphQL Billing API for plan changes

## Changes Made

### 1. Database Schema (schema.prisma)
```diff
model AppMetadata {
  id                    String    @id @default(cuid())
  shop                  String    @unique
  creditsUsed           Int       @default(0)
  creditsLimit          Int       @default(10)
+ productLimit          Int       @default(3)
  isActive              Boolean   @default(true)
  subscriptionCreatedAt DateTime?
  lastResetDate         DateTime  @default(now())
  settings              Json?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

### 2. Billing Service (billing.server.ts)
- ✅ **Store `productLimit`** when creating/updating subscriptions
- ✅ **Read `productLimit`** directly from database instead of calculating
- ✅ **Handle Managed Pricing** errors gracefully
- ✅ **Cancel subscriptions** properly when downgrading to free

### 3. Admin Service (admin.server.ts)
- ✅ **Use stored `productLimit`** from database in dashboard stats
- ✅ **Validate against stored limits** when toggling products

## How It Works Now

### Monthly Reset ✅
```typescript
// Reset only resets credits used, NOT plan limits
if (daysSinceReset >= 30) {
  await prisma.appMetadata.update({
    data: {
      creditsUsed: 0,        // ✅ Reset usage
      lastResetDate: now,     // ✅ Update date
      // productLimit NOT touched - stays the same!
      // creditsLimit NOT touched - stays the same!
    },
  });
}
```

### Plan Upgrade/Downgrade ✅
```typescript
await prisma.appMetadata.upsert({
  update: {
    creditsLimit: plan.credits,      // ✅ Update credit limit
    productLimit: plan.productLimit,  // ✅ Update product limit
    subscriptionCreatedAt: now,
    lastResetDate: now,
  },
});
```

### Product Toggle Validation ✅
```typescript
// Uses stored productLimit directly
const metadata = await prisma.appMetadata.findUnique({ where: { shop } });
const productLimit = metadata.productLimit || 3;

if (productLimit !== -1 && enabledCount >= productLimit) {
  return { exceeded: true };
}
```

## Managed Pricing Solution

Your app uses **Shopify Managed Pricing**, which means:
- ❌ Cannot create subscriptions via GraphQL Billing API
- ✅ Can read subscription status
- ✅ Can cancel subscriptions
- ✅ Merchants choose plans through Shopify's native interface

### What the code now does:
1. **Free Plan**: Cancels any active subscription and updates database
2. **Paid Plans with Managed Pricing**: Catches the error, updates database with plan details, and continues
3. **Paid Plans without Managed Pricing**: Uses normal GraphQL Billing API flow

## Deployment Steps

### 1. Run Migration
```bash
# This will add the productLimit column to AppMetadata
npx prisma migrate deploy
```

### 2. Optional: Set Environment Variable
If you want to explicitly mark the app as using managed pricing:
```bash
SHOPIFY_MANAGED_PRICING=true
```

### 3. Backfill Existing Data (Optional)
If you have existing shops, you may want to backfill their `productLimit` based on their current `creditsLimit`:

```sql
-- Run this SQL on your database
UPDATE "AppMetadata" 
SET "productLimit" = CASE 
  WHEN "creditsLimit" = 50 THEN 3          -- FREE
  WHEN "creditsLimit" = 500 THEN 100       -- SIDE_HUSSL
  WHEN "creditsLimit" = 10000 THEN -1      -- BUSINESS
  WHEN "creditsLimit" = -1 THEN -1         -- ALL_IN
  ELSE 3
END
WHERE "productLimit" IS NULL OR "productLimit" = 0;
```

## Testing

1. **Upgrade to paid plan**: Should work (or gracefully handle managed pricing)
2. **Downgrade to free**: Should cancel subscription and update limits
3. **Enable product**: Should validate against stored `productLimit`
4. **Monthly reset**: Should only reset `creditsUsed`, not limits
5. **Dashboard stats**: Should show correct limits

## Managed Pricing Considerations

Since your app uses Managed Pricing, consider:

**Option A: Keep Current Setup** (Recommended for now)
- Code now handles managed pricing errors gracefully
- Updates database with plan details even when API calls fail
- Works for both API-based billing and managed pricing

**Option B: Switch to API Billing**
1. Go to Partner Dashboard → Apps → Your App → Pricing
2. Disable "Managed Pricing"
3. Remove any pricing plans from the dashboard
4. Let the GraphQL API handle everything

**Option C: Disable In-App Upgrades**
1. Remove the upgrade buttons from the UI
2. Direct merchants to Shopify's billing page
3. Only use the API to read subscription status

For now, Option A (current setup) should work fine!

## Files Modified
- ✅ `prisma/schema.prisma` - Added `productLimit` field
- ✅ `app/services/billing.server.ts` - Store and validate `productLimit`, handle managed pricing
- ✅ `app/services/admin.server.ts` - Use stored `productLimit` in stats

## Next Steps
1. Deploy these changes to production
2. Run the migration: `npx prisma migrate deploy`
3. Optional: Backfill existing data
4. Test upgrade/downgrade flows
5. Monitor logs for any remaining issues

