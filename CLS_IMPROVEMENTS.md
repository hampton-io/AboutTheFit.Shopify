# Cumulative Layout Shift (CLS) Improvements

## Problem
The admin section was failing Shopify's Built for Shopify CLS metric with a score of **0.23** (threshold: 0.1 or less).

## Solution Implemented
According to [Shopify's CLS guidelines](https://shopify.dev/docs/apps/build/performance/admin-installation-oauth#cumulative-layout-shift), we need to minimize unexpected layout shifts. Here's what was implemented:

---

## Changes Made

### 1. Stats Cards - Skeleton Loading States ✅
**File:** `app/routes/app._index.tsx`

**Before:**
- Stats cards appeared suddenly when data loaded
- Caused major layout shift as 4 cards popped into view

**After:**
- Added skeleton loaders with exact dimensions
- Reserved space with `minHeight: '400px'` during loading
- Smooth transition from skeleton to actual content
- No layout shift as skeleton matches final card size

```tsx
{!stats ? (
  // Skeleton loaders with exact dimensions
  <>
    {[1, 2, 3, 4].map((i) => (
      <s-box key={i} padding="base" borderWidth="base" borderRadius="base">
        <s-stack direction="block" gap="base">
          <div style={{ 
            height: '20px', 
            width: '60%', 
            backgroundColor: '#E5E7EB',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          // More skeleton elements...
        </s-stack>
      </s-box>
    ))}
  </>
) : (
  // Actual stats cards
)}
```

---

### 2. Product Images - Explicit Dimensions ✅
**File:** `app/routes/app._index.tsx`

**Before:**
- Images loaded without dimensions, causing shifts
- Browser had to recalculate layout after image load

**After:**
- Added `width` and `height` HTML attributes
- Added `loading="lazy"` for better performance
- Browser reserves exact space before image loads

```tsx
<img
  src={product.image}
  alt={product.title}
  width="60"
  height="60"
  loading="lazy"
  style={{
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '8px',
  }}
/>
```

---

### 3. Product List - Skeleton Loading ✅
**File:** `app/routes/app._index.tsx`

**Before:**
- Simple spinner that didn't match content height
- Products list appeared suddenly, causing shift

**After:**
- Skeleton loaders matching exact product card dimensions
- Each skeleton has `minHeight: '76px'` (matches actual card)
- Includes image placeholder, text placeholders, and toggle placeholder
- Smooth transition when real products load

```tsx
{isLoading ? (
  <s-stack direction="block" gap="base">
    {[1, 2, 3].map((i) => (
      <s-box key={i} padding="base" borderWidth="base" borderRadius="base">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          minHeight: '76px' // Match actual product card height
        }}>
          {/* Image skeleton */}
          <div style={{ 
            width: '60px', 
            height: '60px', 
            backgroundColor: '#E5E7EB',
            borderRadius: '8px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          // More skeleton elements...
        </div>
      </s-box>
    ))}
  </s-stack>
) : (
  // Actual products
)}
```

---

### 4. Pulse Animation ✅
**File:** `app/routes/app._index.tsx`

Added smooth CSS animation for skeleton loaders:

```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

This provides visual feedback that content is loading without causing layout shifts.

---

### 5. App Bridge Script for Web Vitals ✅
**File:** `app/root.tsx`

Added the App Bridge script to enable Shopify's Web Vitals tracking:

```tsx
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
```

This allows Shopify to measure and report CLS scores in the Partner Dashboard.

---

## Best Practices Followed

### ✅ Reserve Space
- All loading states have explicit dimensions matching final content
- Use `minHeight`, `width`, and `height` to reserve space

### ✅ Explicit Image Dimensions
- All images have `width` and `height` attributes
- Browser knows exact space needed before image loads

### ✅ Skeleton Loaders
- Match exact dimensions of final content
- Provide smooth visual transition
- Prevent sudden content appearance

### ✅ Fixed Positioning for Modals
- Billing modal uses `position: fixed`
- Doesn't push page content around
- Overlays existing content without shifts

---

## Expected Results

With these changes, the CLS score should drop from **0.23** to **below 0.1**, meeting Shopify's Built for Shopify requirements:

> **Mandatory:** 75% of the time, your app should have a Cumulative Layout Shift of 0.1 or less, measured over a 28 day period.

---

## Testing

1. **Clear browser cache** to test fresh page loads
2. **Throttle network** to slow down loading and observe skeleton states
3. **Use Chrome DevTools** Performance tab to measure CLS
4. **Check Shopify Partner Dashboard** after deployment for Web Vitals metrics

---

## Additional Resources

- [Shopify CLS Guidelines](https://shopify.dev/docs/apps/build/performance/admin-installation-oauth#cumulative-layout-shift)
- [Web Vitals](https://web.dev/vitals/)
- [Cumulative Layout Shift](https://web.dev/cls/)
- [Polaris Loading Patterns](https://polaris.shopify.com/patterns/loading)

---

## Accessibility Fixes ✅

Added proper accessibility labels to switch components to fix Polaris warnings and improve screen reader support:

```tsx
<s-switch
  checked={product.tryOnEnabled}
  onChange={(e: any) => handleToggle(product, e.target.checked)}
  disabled={toggleFetcher.state !== 'idle'}
  accessibilityLabel={`Toggle virtual try-on for ${product.title}`}
/>
```

**Why this matters:**
- Screen readers can now properly announce what each switch controls
- Meets WCAG accessibility guidelines
- Removes console warnings
- Good accessibility practices contribute to overall app quality

---

## Files Modified

1. ✅ `app/routes/app._index.tsx` - Added skeleton loaders, explicit image dimensions, accessibility labels, fixed button layout shifts
2. ✅ `app/root.tsx` - Added App Bridge script for Web Vitals tracking

