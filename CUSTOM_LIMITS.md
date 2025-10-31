# Custom Limits Feature

## Problem
When you manually changed `creditsLimit` and `productLimit` in the `app_metadata` table, they were being reset to plan defaults whenever the user refreshed the app.

## Solution
Added a `hasCustomLimits` flag to protect manually set limits from being overwritten by the subscription sync process.

## Changes Made

### 1. Database Schema
Added `hasCustomLimits` field to `AppMetadata` model:
```prisma
model AppMetadata {
  // ... existing fields
  hasCustomLimits       Boolean   @default(false)
  // ... rest of fields
}
```

### 2. Billing Service Updates
- Modified `updateShopPlan()` to check `hasCustomLimits` before updating limits
- Added `setCustomLimits()` function to set custom limits programmatically
- Added `removeCustomLimits()` function to revert to plan defaults

### 3. Helper Script
Created `/scripts/set-custom-limits.ts` for easy limit management

## How to Use

### Set Custom Limits

```bash
# Set specific limits
npx tsx scripts/set-custom-limits.ts myshop.myshopify.com 1000 50

# Set unlimited
npx tsx scripts/set-custom-limits.ts myshop.myshopify.com -1 -1
```

### Remove Custom Limits (Revert to Plan Defaults)

```bash
npx tsx scripts/set-custom-limits.ts myshop.myshopify.com --remove
```

### Manual Database Update

If you prefer to update the database directly:

```sql
-- Set custom limits
UPDATE app_metadata 
SET 
  credits_limit = 1000,
  product_limit = 50,
  has_custom_limits = true
WHERE shop = 'myshop.myshopify.com';

-- Remove custom limits (revert to plan defaults)
UPDATE app_metadata 
SET has_custom_limits = false
WHERE shop = 'myshop.myshopify.com';
```

**Important:** When setting custom limits manually via SQL, you MUST also set `has_custom_limits = true` to prevent them from being overwritten!

## How It Works

1. **Normal Flow (No Custom Limits)**
   - User subscribes to a plan
   - `updateShopPlan()` sets limits based on plan
   - Every app refresh syncs limits with plan

2. **Custom Limits Flow**
   - You set custom limits using script or SQL
   - `hasCustomLimits` flag is set to `true`
   - `updateShopPlan()` skips updating limits when flag is true
   - Custom limits persist across app refreshes

3. **Removing Custom Limits**
   - Set `hasCustomLimits` to `false`
   - Next app refresh will sync limits with plan
   - Limits revert to plan defaults

## API Functions

### `setCustomLimits(shop, creditsLimit, productLimit)`
```typescript
import { setCustomLimits } from '../services/billing.server';

// Set custom limits
await setCustomLimits('myshop.myshopify.com', 1000, 50);

// Set unlimited
await setCustomLimits('myshop.myshopify.com', -1, -1);
```

### `removeCustomLimits(shop)`
```typescript
import { removeCustomLimits } from '../services/billing.server';

// Remove custom limits - will revert to plan defaults on next sync
await removeCustomLimits('myshop.myshopify.com');
```

## Testing

1. Set custom limits for a shop
2. Have the user refresh the app in Shopify admin
3. Check database - limits should remain unchanged
4. Remove custom limits
5. Have user refresh again
6. Check database - limits should now match their plan

## Notes

- Custom limits persist indefinitely until explicitly removed
- Use `-1` for unlimited credits/products
- The script validates that the shop exists before updating
- Changes take effect immediately (no app restart needed)

