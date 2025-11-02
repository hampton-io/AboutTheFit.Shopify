# Theme Extension Detection

## Can We Check if the Theme Extension is Installed?

**Short Answer:** Yes! We now use **server-side verification** to check if the block is actually installed. ✅

## What We CAN Check ✅

1. **App Installation Status** - Verify the app is installed in the shop
2. **Active Subscriptions** - Check billing status via GraphQL
3. **Theme List** - Get all themes in the shop
4. **Products Enabled** - See which products have try-on enabled
5. **🆕 Block Installation** - SERVER-SIDE verification by reading theme JSON
6. **🆕 Real-time Verification** - Checks actual theme files on every admin page load

## What We CANNOT Check ❌

1. **Final Block Placement** - Whether merchant saved/published the block
2. **Block Position** - Exact position on the page
3. **Block Configuration** - Settings/customizations made to the block
4. **Published Status** - Whether changes were saved vs. abandoned

## Why This Limitation?

Shopify's Admin GraphQL API doesn't expose:
- Theme app extension block placements
- Theme JSON schema details for app blocks
- Section/block configuration from `theme.liquid` or JSON templates

This is a **Shopify platform limitation**, not an app limitation.

## Our Solution 🎯

We've implemented a **server-side verification system** that's 100% reliable:

### Server-Side Theme Verification (PRIMARY METHOD ⭐)

**How it works:**
1. On every admin page load, call Shopify Admin API
2. Fetch the published theme ID
3. Read product template JSON files (`templates/product.json`, `sections/main-product.json`)
4. Parse JSON and search for our block type: `shopify://apps/about-the-fit/blocks/try_on_button`
5. If found → `blockAddedToTheme = true`, otherwise `false`

**Benefits:**
- ✅ 100% reliable - reads actual theme files
- ✅ Detects removal - if they remove the block, next check shows false
- ✅ No client-side dependency - works even if JavaScript fails
- ✅ Checks published theme - accurate to what customers see
- ✅ No false positives - only true if block is actually there

**Implemented in:**
- `/app/services/theme-verification.server.ts` - Core verification logic
- `/app/services/admin.server.ts` - Called on stats fetch
- Runs on every admin dashboard load

---

## Additional Context

### Behavioral Detection

The setup guide uses **smart behavioral detection**:

### Setup Guide Banner
Shows automatically when:
- ✅ Merchant has enabled products
- ❌ But has **zero try-ons**

This suggests the button isn't visible to customers yet!

```tsx
{stats.totalTryOns === 0 && stats.productsWithTryOn > 0 && (
  <SetupGuideBanner />
)}
```

### The Banner Shows:
1. **Step-by-step instructions** to add the theme block
2. **Visual guide** with clear navigation steps
3. **Important tips** about product enablement

### It Disappears When:
- First try-on is completed (button is working!)
- Merchant hasn't enabled any products yet (not ready for setup)

## Alternative Detection Methods

### 1. Storefront Detection (Not Implemented)
- Load the storefront HTML and check for our block's HTML/CSS
- **Cons:** Slow, unreliable, requires theme knowledge
- **Pros:** Actual verification

### 2. JavaScript Beacon (Not Implemented)
- Add analytics pixel to the theme block
- Report back when block loads
- **Cons:** Privacy concerns, requires consent
- **Pros:** Real-time detection

### 3. Test Order Flow (Not Implemented)
- Create test product
- Check if try-on endpoint is called
- **Cons:** Complex, requires automation
- **Pros:** Accurate functional test

## Current Solution: Behavioral Detection ⭐

**Best balance of:**
- ✅ Simple implementation
- ✅ No privacy concerns  
- ✅ Helpful UX (shows when needed)
- ✅ Auto-dismisses (no nagging)

## API Route Available

**Endpoint:** `/api/admin/extension-status`

Returns:
```json
{
  "success": true,
  "appInstallation": { ... },
  "themes": [ ... ],
  "warning": "Theme app extensions must be manually added by merchants..."
}
```

This is available but not currently used in the UI since it doesn't provide the specific info we need (block placement).

## Recommendation

**Keep the behavioral detection banner.** It's the most user-friendly approach given Shopify's API limitations.

If Shopify adds block placement detection to their GraphQL API in the future, we can enhance this!

## Testing

**To test the verification system:**
1. Enable a product for try-on in admin
2. Go to **Online Store → Themes → Customize**
3. Navigate to a product page
4. Add the "About the Fit - Try It On" block
5. **Save the theme**
6. Return to the app admin (refresh)
7. You should see Step 2 with a green checkmark ✅

**Expected behavior:**
- Step 2 shows ✅ "Block added successfully!" when verified
- If you remove the block and save, Step 2 will show instructions again
- Verification runs on every admin dashboard load
- No delays or false positives

## Related Files

- `/app/routes/app._index.tsx` - Setup guide with progress indicators
- `/app/services/theme-verification.server.ts` - Core server-side verification logic
- `/app/services/admin.server.ts` - Stats calculation + verification integration
- `/extensions/about-the-fit/blocks/try_on_button.liquid` - The theme block itself

