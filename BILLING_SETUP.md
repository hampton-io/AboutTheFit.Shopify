# Billing Setup for Production

## Prerequisites

Before enabling billing in production, you need to:

### 1. Partner Dashboard Configuration

1. Go to [Shopify Partners](https://partners.shopify.com)
2. Navigate to your app: **AboutTheFit**
3. Go to **Distribution** section
4. Set distribution to **Public** or **Custom** (not Unlisted)
5. Complete app listing requirements:
   - App description
   - App icon
   - Screenshots
   - Privacy policy URL
   - Support contact

### 2. App Scopes

✅ Already configured in `shopify.app.toml`:
- `read_products` - Read product data
- `write_payment_terms` - **Required for billing**

After updating scopes, merchants will need to re-authorize the app.

### 3. Environment Variables

Required for production:

```bash
# Set by Shopify CLI automatically in production
SHOPIFY_APP_URL=https://your-app-url.com

# Set NODE_ENV to production
NODE_ENV=production

# Database (already configured)
DATABASE_URL=your_supabase_connection_string
DIRECT_URL=your_supabase_direct_connection

# Shopify credentials (set by deployment platform)
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
```

## How Billing Works

### Development Mode
- **Detection**: `NODE_ENV === 'development'` OR `SHOPIFY_APP_URL` is not set
- **Behavior**: Updates database directly, no Shopify Billing API calls
- **Purpose**: Test UI and flow without actual charges

### Production Mode
- **Detection**: `NODE_ENV === 'production'` AND `SHOPIFY_APP_URL` is set
- **Behavior**: Uses Shopify Billing API for real subscriptions
- **Purpose**: Actual merchant billing through Shopify

## Pricing Plans

| Plan | Price | Credits | Features |
|------|-------|---------|----------|
| **Free** | $0 | 10/month | Basic virtual try-on |
| **Side Hussle** | $9.99/month | 500/month | Priority support, Advanced features |
| **Business** | $39/month | 10,000/month | Full analytics suite, Dedicated support |
| **All In** | $99/month | Unlimited | Custom integrations, 24/7 support |

## Billing Flow

### 1. Merchant Upgrades Plan
```
Admin UI → Click "Upgrade Plan" → Select Plan → API Call
```

### 2. Subscription Creation
```javascript
// Production: Creates Shopify subscription
admin.graphql(`
  mutation appSubscriptionCreate(
    $name: String!
    $lineItems: [AppSubscriptionLineItemInput!]!
    $returnUrl: URL!
  ) { ... }
`)
```

### 3. Merchant Approval
- Shopify redirects to confirmation URL
- Merchant approves charges
- Shopify redirects back to app

### 4. Confirmation
```
/api/billing/confirm?shop=...&plan=... 
→ Verify subscription active
→ Update database
→ Show success message
```

## Testing Billing

### Option 1: Development Mode (Current)
- No real charges
- Test UI/UX
- Database updates only

### Option 2: Test Store (Production-like)
1. Deploy app to production environment
2. Install on a **development store**
3. Development stores can test billing without charges
4. All billing flows work except actual payment

### Option 3: Production Store
1. Publish app to Shopify App Store
2. Install on real merchant stores
3. Real charges apply

## Deployment Checklist

- [x] Add `write_payment_terms` scope
- [ ] Set `NODE_ENV=production` in deployment
- [ ] Ensure `SHOPIFY_APP_URL` is set correctly
- [ ] Test on development store first
- [ ] Submit app for Shopify review (if going to App Store)
- [ ] Monitor billing webhooks for subscription updates
- [ ] Set up error tracking (Sentry recommended)

## Database Schema

The `AppMetadata` table tracks billing:

```prisma
model AppMetadata {
  id                     String    @id @default(cuid())
  shop                   String    @unique
  creditsUsed            Int       @default(0)
  creditsLimit           Int       @default(10)
  isActive               Boolean   @default(true)
  subscriptionCreatedAt  DateTime?
  shopifySubscriptionId  String?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
}
```

## Support & Troubleshooting

### Common Issues

**1. "Apps without public distribution cannot use the Billing API"**
- Solution: Set distribution to Public/Custom in Partner Dashboard

**2. Billing not working in production**
- Check `NODE_ENV=production` is set
- Verify `SHOPIFY_APP_URL` is correct
- Ensure app has `write_payment_terms` scope

**3. Development mode not detecting properly**
- Clear and set environment variables
- Restart dev server

### Monitoring

Track these metrics:
- Subscription creation rate
- Failed billing attempts
- Plan upgrades/downgrades
- Credit usage patterns

## Next Steps

1. **Deploy to production** (Vercel, Railway, or Fly.io)
2. **Test on development store** with real billing flow
3. **Submit for App Store review** (if applicable)
4. **Monitor first installations** closely
5. **Iterate based on merchant feedback**

