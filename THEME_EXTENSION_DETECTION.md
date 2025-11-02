# Theme Extension Detection

## Can We Check if the Theme Extension is Installed?

**Short Answer:** Yes! We now detect theme editor activity in real-time. ✅

## What We CAN Check ✅

1. **App Installation Status** - Verify the app is installed in the shop
2. **Active Subscriptions** - Check billing status via GraphQL
3. **Theme List** - Get all themes in the shop
4. **Products Enabled** - See which products have try-on enabled
5. **🆕 Theme Editor Activity** - Detect when merchants open the theme customizer with our block
6. **🆕 Real-time Status** - Show live indicators when editor is active

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

We've implemented a **beacon-based detection system** that works in real-time:

### Theme Editor Beacon (NEW! ⭐)

**How it works:**
1. Our Liquid block detects when it's loaded in theme editor mode (`request.design_mode`)
2. It sends a "beacon" signal to our backend: `/apps/aboutthefit/editor-beacon`
3. Backend stores the timestamp in `AppMetadata.settings.lastEditorActivity`
4. Admin dashboard shows real-time status indicators

**Status Indicators:**
- 🟢 **Active** (green) - Editor opened within last 10 minutes
- 🟡 **Recent** (yellow) - Editor opened within last 24 hours  
- ⚪ **Never** - No editor activity detected

**Benefits:**
- ✅ Real-time feedback to merchants
- ✅ Confirms they're on the right path
- ✅ Non-intrusive (silent beacon)
- ✅ No privacy concerns

### Behavioral Detection

We also use **smart behavioral detection**:

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

## Implementation Details

### Backend Components

**Beacon Endpoint:**
```typescript
/app/routes/api.proxy.editor-beacon.tsx
```
- Receives POST requests when block loads in theme editor
- Stores timestamp in `AppMetadata.settings.lastEditorActivity`
- Returns success/failure status

**Stats Enhancement:**
```typescript
/app/services/admin.server.ts
```
- Updated `DashboardStats` interface with:
  - `lastEditorActivity`: ISO timestamp
  - `editorActivityStatus`: 'active' | 'recent' | 'never'
- Calculates status based on time elapsed:
  - Active: < 10 minutes
  - Recent: < 24 hours
  - Never: No activity or older

### Frontend Components

**Theme Block:**
```liquid
/extensions/about-the-fit/blocks/try_on_button.liquid
```
- Detects `request.design_mode`
- Sends beacon on load: `fetch('/apps/aboutthefit/editor-beacon')`
- Silent failure (non-critical)

**Admin Dashboard:**
```typescript
/app/routes/app._index.tsx
```
- Shows setup guide banner when needed
- Displays real-time status indicators:
  - 🟢 Green badge for active editor
  - 🟡 Yellow badge for recent activity
  - No badge if never opened

## Testing

**To test the beacon system:**
1. Enable a product for try-on in admin
2. Go to **Online Store → Themes → Customize**
3. Navigate to a product page
4. Add the "About the Fit - Try It On" block
5. Return to the app admin (refresh)
6. You should see 🟢 "Theme editor is open!"

**Expected behavior:**
- Status changes from "never" to "active" immediately
- After 10 minutes of inactivity, changes to "recent" 
- After 24 hours, no longer shows status
- Banner disappears after first try-on is completed

## Related Files

- `/app/routes/app._index.tsx` - Setup guide banner + status indicators
- `/app/routes/api.proxy.editor-beacon.tsx` - Beacon receiver endpoint
- `/app/routes/api.admin.extension-status.tsx` - API route (for future GraphQL use)
- `/app/services/admin.server.ts` - Stats calculation + editor activity
- `/extensions/about-the-fit/blocks/try_on_button.liquid` - The theme block (beacon sender)

