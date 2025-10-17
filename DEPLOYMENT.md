# Deployment Guide - About the Fit

## 🚀 What We Just Built

### Features Completed
✅ Shopify Billing Integration (4 pricing tiers)
✅ Virtual Try-On with improved AI prompts
✅ Admin dashboard with billing management
✅ Modal UI for plan selection
✅ Development mode (mock billing) + Production mode (real billing)
✅ Vercel Analytics for page view tracking
✅ Vercel Speed Insights for performance monitoring
✅ Comprehensive documentation

### Git Status
- **Latest Commits**:
  - `eee1d0c` - Vercel Analytics and Speed Insights
  - `ee8f061` - Shopify billing integration
- **Pushed to**: `origin/main` (github.com:hampton-io/AboutTheFit.Shopify.git)

## 📦 Deploying to Vercel

### Option 1: Deploy via Vercel Dashboard

1. **Go to [Vercel Dashboard](https://vercel.com/new)**
2. **Import Git Repository**:
   - Select: `hampton-io/AboutTheFit.Shopify`
   - Framework Preset: **React Router**
   - Root Directory: `./` (default)

3. **Configure Environment Variables**:
```bash
# Shopify Credentials (from Partner Dashboard)
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Google AI
GOOGLE_AI_API_KEY=your_google_ai_key

# Supabase Storage
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Important: Set these for production
NODE_ENV=production
```

4. **Deploy** 🚀

### Option 2: Deploy via CLI

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow prompts to set environment variables
```

## 🔄 After Deployment

### 1. Update Shopify App URLs

Once deployed, update your `shopify.app.toml` with the Vercel URL:

```toml
application_url = "https://your-app-name.vercel.app"

[auth]
redirect_urls = [ "https://your-app-name.vercel.app/api/auth" ]
```

Then redeploy the app to Shopify:

```bash
shopify app deploy
```

### 2. Vercel Configuration

Vercel will automatically set `SHOPIFY_APP_URL` based on your deployment URL.

### 3. Enable Analytics

- **Vercel Analytics**: Automatically enabled in production
- **Speed Insights**: Automatically enabled in production
- View in [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Analytics

## 🧪 Testing

### Development Store Testing

1. Install app on your development store: `about-the-fit-dev-store.myshopify.com`
2. Test billing flow (dev stores can test without charges)
3. Verify analytics tracking in Vercel dashboard

### Production Testing Checklist

- [ ] App loads correctly in Shopify Admin
- [ ] Products list displays
- [ ] Virtual try-on works on storefront
- [ ] Billing modal opens
- [ ] Plan upgrades work (test on dev store first)
- [ ] Analytics tracking appears in Vercel
- [ ] Speed Insights data shows up

## 📊 Monitoring

### Vercel Dashboard
- **Analytics**: Page views, visitors, top pages
- **Speed Insights**: Core Web Vitals, performance scores
- **Logs**: Real-time function logs
- **Deployments**: Build logs and status

### Database (Supabase)
Monitor:
- `AppMetadata` table for billing subscriptions
- `TryOnRequest` table for usage tracking
- `ProductTryOnSettings` for enabled products

## 🔧 Environment-Specific Behavior

### Development (Local)
- `NODE_ENV=development`
- Mock billing (no Shopify API calls)
- Database updates only
- Good for UI/UX testing

### Production (Vercel)
- `NODE_ENV=production`
- Real Shopify Billing API
- Actual charges to merchants
- Full analytics tracking

## 🚨 Important Notes

### Before Going Live

1. **Partner Dashboard**:
   - Set distribution to **Public** or **Custom**
   - Complete app listing (description, icon, screenshots)
   - Add privacy policy and support contact

2. **Billing**:
   - Test thoroughly on development store
   - Verify webhooks for subscription updates
   - Monitor first installations closely

3. **Monitoring**:
   - Set up error tracking (Sentry recommended)
   - Monitor Vercel logs for issues
   - Watch database for unusual patterns

### Pricing Plans

| Plan | Price | Credits | Use Case |
|------|-------|---------|----------|
| Free | $0 | 10/month | Testing & small stores |
| Side Hussle | $9.99/month | 500/month | Growing stores |
| Business | $39/month | 10,000/month | Established stores |
| All In | $99/month | Unlimited | High-volume & agencies |

## 📚 Additional Resources

- [Shopify App Development Docs](https://shopify.dev/docs/apps)
- [Vercel Deployment Docs](https://vercel.com/docs)
- [React Router v7 Docs](https://reactrouter.com)
- [Billing Setup Guide](./BILLING_SETUP.md)

## 🎉 Next Steps

1. Deploy to Vercel
2. Update Shopify app URLs
3. Test on development store
4. Monitor analytics and performance
5. Submit for App Store review (if applicable)

Good luck with your launch! 🚀

