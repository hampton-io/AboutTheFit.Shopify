# Deploying About The Fit to Vercel

## Prerequisites

1. Vercel account
2. GitHub repository connected to Vercel
3. Supabase account with PostgreSQL database
4. Google AI API key
5. Shopify Partner account with app created

## Step 1: Set Up Your Database (Supabase)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or use existing one
3. Go to **Settings > Database**
4. Copy both connection strings:
   - **Connection Pooling** (port 6543) - for DATABASE_URL
   - **Transaction Mode** (port 5432) - for DIRECT_URL
5. Replace `[YOUR-PASSWORD]` with your actual database password

Example:
```
DATABASE_URL="postgresql://postgres.xxxxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

## Step 2: Get Google AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key

## Step 3: Get Supabase Storage Keys

1. In Supabase Dashboard, go to **Settings > API**
2. Copy:
   - Project URL (SUPABASE_URL)
   - anon public key (SUPABASE_ANON_KEY)
   - service_role key (SUPABASE_SERVICE_ROLE_KEY)

## Step 4: Configure Vercel Environment Variables

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings > Environment Variables**
4. Add the following environment variables:

### Required Variables

| Variable Name | Description | Example/Notes |
|--------------|-------------|---------------|
| `SHOPIFY_API_KEY` | From Shopify Partner Dashboard | Get from app settings |
| `SHOPIFY_API_SECRET` | From Shopify Partner Dashboard | Get from app settings |
| `SHOPIFY_APP_URL` | Your Vercel deployment URL | `https://your-app.vercel.app` |
| `SCOPES` | OAuth scopes | `write_products,read_customers,write_customers` |
| `DATABASE_URL` | Supabase connection pooling URL | Port 6543 with pgbouncer |
| `DIRECT_URL` | Supabase direct connection URL | Port 5432 |
| `GOOGLE_AI_API_KEY` | Google AI API key | From Google AI Studio |
| `SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | From Supabase API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | From Supabase API settings |
| `NODE_ENV` | Environment | Set to `production` |

### Important Notes

- **SHOPIFY_APP_URL**: Use your actual Vercel URL (e.g., `https://about-the-fit.vercel.app`)
- Add these to **all environments** (Production, Preview, Development) in Vercel
- After adding variables, you'll need to redeploy

## Step 5: Update Shopify App Settings

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Open your app
3. Go to **Configuration**
4. Update:
   - **App URL**: `https://your-app.vercel.app`
   - **Allowed redirection URLs**: `https://your-app.vercel.app/auth/callback`
   - **App proxy**: `/apps/aboutthefit` → `https://your-app.vercel.app/api/proxy`

## Step 6: Set Up Database Schema

After deploying to Vercel, you need to initialize your database:

### Option A: Run from local machine
```bash
# Set your production DATABASE_URL temporarily
export DATABASE_URL="your_production_database_url"
npx prisma db push
```

### Option B: Use Supabase SQL Editor
1. Go to Supabase Dashboard > SQL Editor
2. Run the following to create tables:

```sql
-- Create session table (lowercase required by Shopify session storage)
CREATE TABLE "session" (
  "id" TEXT PRIMARY KEY,
  "shop" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "isOnline" BOOLEAN DEFAULT false NOT NULL,
  "scope" TEXT,
  "expires" TIMESTAMP,
  "accessToken" TEXT NOT NULL,
  "userId" BIGINT,
  "firstName" TEXT,
  "lastName" TEXT,
  "email" TEXT,
  "accountOwner" BOOLEAN DEFAULT false NOT NULL,
  "locale" TEXT,
  "collaborator" BOOLEAN DEFAULT false,
  "emailVerified" BOOLEAN DEFAULT false
);

-- Create enum type
CREATE TYPE "TryOnStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- Create TryOnRequest table
CREATE TABLE "TryOnRequest" (
  "id" TEXT PRIMARY KEY,
  "shop" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productTitle" TEXT NOT NULL,
  "productImage" TEXT NOT NULL,
  "userPhotoUrl" TEXT NOT NULL,
  "resultImageUrl" TEXT,
  "status" "TryOnStatus" DEFAULT 'PENDING' NOT NULL,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE INDEX "TryOnRequest_shop_idx" ON "TryOnRequest"("shop");
CREATE INDEX "TryOnRequest_status_idx" ON "TryOnRequest"("status");
CREATE INDEX "TryOnRequest_createdAt_idx" ON "TryOnRequest"("createdAt");

-- Create AppMetadata table
CREATE TABLE "AppMetadata" (
  "id" TEXT PRIMARY KEY,
  "shop" TEXT UNIQUE NOT NULL,
  "creditsUsed" INTEGER DEFAULT 0 NOT NULL,
  "creditsLimit" INTEGER DEFAULT 10 NOT NULL,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "settings" JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

-- Create ProductTryOnSettings table
CREATE TABLE "ProductTryOnSettings" (
  "id" TEXT PRIMARY KEY,
  "shop" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productTitle" TEXT NOT NULL,
  "productImage" TEXT NOT NULL,
  "tryOnEnabled" BOOLEAN DEFAULT false NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE("shop", "productId")
);

CREATE INDEX "ProductTryOnSettings_shop_idx" ON "ProductTryOnSettings"("shop");
CREATE INDEX "ProductTryOnSettings_tryOnEnabled_idx" ON "ProductTryOnSettings"("tryOnEnabled");
```

## Step 7: Deploy

1. Push your code to GitHub
2. Vercel will automatically deploy
3. Or manually redeploy from Vercel dashboard

## Step 8: Install the App

1. Go to your app URL: `https://your-app.vercel.app`
2. You'll be redirected to Shopify OAuth
3. Install on your development store
4. Configure products in the admin panel

## Troubleshooting

### "SHOPIFY_APP_URL is empty"
- Make sure `SHOPIFY_APP_URL` is set in Vercel environment variables
- Redeploy after adding the variable

### "Prisma Client could not connect"
- Verify DATABASE_URL is correct
- Check that connection pooling is enabled (port 6543)
- Verify DIRECT_URL uses port 5432

### "Invalid scope"
- Check that SCOPES environment variable is set
- Format: comma-separated, no spaces: `write_products,read_customers`

### Database connection limit reached
- Use connection pooling URL (port 6543) for DATABASE_URL
- Set `connection_limit=1` in the connection string
- Consider upgrading Supabase plan if needed

### Function timeout
- Increase maxDuration in vercel.json (currently set to 30s)
- For AI operations, consider background jobs

## Vercel-Specific Configuration

The repository includes:
- `react-router.config.ts` - Official Vercel preset for React Router v7
- `vercel.json` - Framework specification
- `.vercelignore` - Files to ignore during deployment
- `postinstall` script in package.json - Generates Prisma client automatically

This app uses the official Vercel React Router v7 integration announced in [Vercel's changelog](https://vercel.com/changelog/support-for-react-router-v7).

## Environment Variable Checklist

✅ Copy this checklist when configuring Vercel:

- [ ] SHOPIFY_API_KEY
- [ ] SHOPIFY_API_SECRET
- [ ] SHOPIFY_APP_URL (use your actual Vercel URL)
- [ ] SCOPES
- [ ] DATABASE_URL (Supabase connection pooling)
- [ ] DIRECT_URL (Supabase direct connection)
- [ ] GOOGLE_AI_API_KEY
- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] NODE_ENV=production

## Next Steps

After successful deployment:
1. Test the admin interface
2. Enable try-on for test products
3. Test the storefront integration
4. Monitor logs in Vercel dashboard
5. Set up error tracking (optional: Sentry)

## Support

For issues:
- Check Vercel logs: Project > Deployments > [latest] > Function Logs
- Check Supabase logs: Dashboard > Logs
- Review Shopify Partner Dashboard > Apps > [Your App] > Error logs

