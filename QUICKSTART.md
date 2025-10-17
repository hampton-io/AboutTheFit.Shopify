# Quick Start Guide - About the Fit

Get your virtual try-on Shopify app running in 15 minutes.

---

## Prerequisites

- [ ] Shopify Partner account
- [ ] Supabase account (free tier is fine)
- [ ] Google AI API key

---

## 1. Get API Keys (5 minutes)

### Supabase Setup
1. Go to [supabase.com](https://supabase.com) → Create new project
2. Wait for provisioning (~2 minutes)
3. Go to **Settings** > **Database**
   - Copy **Connection string** (session mode with pooler)
   - Copy **Direct connection** string
4. Go to **Settings** > **API**
   - Copy **Project URL**
   - Copy **anon/public** key
5. Go to **Storage** → Create bucket `tryon-photos` (make it public)

### Google AI API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Get API Key" → Create key
3. Copy the API key

---

## 2. Configure Environment (2 minutes)

Create `.env` file in the project root:

```bash
# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Google AI
GOOGLE_AI_API_KEY="your_key_here"

# Supabase
SUPABASE_URL="https://[PROJECT].supabase.co"
SUPABASE_ANON_KEY="your_anon_key"

# Shopify (will be auto-populated by CLI)
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
```

Replace `[PASSWORD]` and `[PROJECT]` with your actual values.

---

## 3. Install & Setup (3 minutes)

```bash
# Install dependencies
npm install

# Push database schema
npx prisma db push

# Generate Prisma client (if needed)
npx prisma generate
```

---

## 4. Start Development Server (1 minute)

```bash
npm run dev
```

The Shopify CLI will:
1. Ask you to select/create a development store
2. Install the app on the store
3. Open the app in the Shopify admin

---

## 5. Test the Installation (2 minutes)

1. App should open in Shopify admin
2. You'll see the default "Generate a product" page
3. This confirms authentication is working

---

## What's Working Now ✅

- ✅ Database schema (PostgreSQL + Prisma)
- ✅ Authentication with Shopify
- ✅ Backend services (AI, storage, products, try-on logic)
- ✅ Type definitions
- ✅ Credit tracking system

---

## What's NOT Working Yet ⚠️

- ❌ UI for selecting products (still shows template UI)
- ❌ Photo upload interface
- ❌ API routes for try-on creation
- ❌ Results display
- ❌ Frontend integration with AI service

---

## Next Steps 🚀

### Option A: Build the Frontend (Recommended)

Follow **TODO.md** Phase 3-4 to build:
1. API routes (`app/routes/api.*.tsx`)
2. Product selector component
3. Photo upload component
4. Results display

### Option B: Test Services in Isolation

You can test the services directly:

```typescript
// In a route or test file
import { virtualTryOnAI } from '~/services/ai.server';

const result = await virtualTryOnAI.analyzeClothing(imageUrl);
console.log(result);
```

---

## Troubleshooting

### "Cannot connect to database"
- Check DATABASE_URL and DIRECT_URL are correct
- Verify Supabase project is active
- Test connection: `npx prisma studio`

### "GOOGLE_AI_API_KEY is not set"
- Check `.env` file exists and has the key
- Restart dev server after adding keys

### "Prisma client not found"
- Run: `npm run prisma generate`

### "Migration failed"
- Delete `prisma/migrations` folder
- Run: `npm run prisma migrate dev --name init`

---

## Important Files Reference

| File | Purpose |
|------|---------|
| `TODO.md` | Complete implementation roadmap (10 phases) |
| `SETUP.md` | Detailed setup instructions |
| `PROGRESS.md` | What's done and what's next |
| `env.example` | Environment variables template |
| `prisma/schema.prisma` | Database schema |
| `app/services/ai.server.ts` | AI/ML integration |
| `app/services/storage.server.ts` | File uploads |
| `app/services/tryon.server.ts` | Business logic |
| `app/services/products.server.ts` | Shopify products |
| `app/types/tryon.ts` | TypeScript types |

---

## Commands Cheat Sheet

```bash
# Development
npm run dev                         # Start dev server
npm run lint                        # Run linter
npm run typecheck                   # Check TypeScript

# Database
npm run prisma studio              # Open database GUI
npx prisma db push                 # Push schema to database
npx prisma generate                # Generate Prisma client

# Shopify CLI
npm run shopify                    # Access Shopify CLI
npm run deploy                     # Deploy to production
npm run shopify app config link    # Link to existing app
```

---

## Getting Help

1. Check `TODO.md` for implementation details
2. Check `SETUP.md` for configuration help
3. Check `PROGRESS.md` for current status
4. Review service files for code examples
5. Check Shopify docs: https://shopify.dev/docs/apps

---

## Production Checklist (Future)

Before launching to production:

- [ ] Switch to production Supabase database
- [ ] Set up proper environment variables
- [ ] Configure Shopify app settings
- [ ] Add error tracking (Sentry)
- [ ] Set up monitoring
- [ ] Configure billing/credits
- [ ] Add analytics
- [ ] Test on real stores
- [ ] Prepare app store listing
- [ ] Write privacy policy & terms

See **TODO.md Phase 7-10** for details.

---

## Cost Estimates (Per Try-On)

- Database: ~$0 (free tier handles thousands)
- Storage: ~$0.001 (10KB per image)
- Google AI (Gemini 2.5 Flash Image): ~$0.001-0.01
- **Total: ~$0.01-0.02 per try-on**

With 10 free credits per shop, initial cost is $0.10-0.20 per shop.

---

## Success Metrics to Track

- Number of try-ons per shop
- Completion rate (completed vs failed)
- Average processing time
- User retention (returning users)
- Conversion impact (do try-ons increase sales?)

Implement tracking in **TODO.md Phase 9**.

---

**You're all set! Follow TODO.md to build out the features. Start with Phase 3 (API Routes).**

