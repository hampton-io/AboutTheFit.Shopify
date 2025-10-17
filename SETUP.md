# Setup Guide - About the Fit

Quick guide to get your virtual try-on app running.

## Prerequisites

- Node.js 20.10 or higher
- A Shopify Partner account
- A Supabase account (free tier is fine)
- Google AI API key

---

## Step 1: Supabase Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the database to be provisioned
3. Go to **Settings** > **Database** and copy:
   - Connection string (URI) for `DATABASE_URL`
   - Direct connection string for `DIRECT_URL`
4. Go to **Settings** > **API** and copy:
   - Project URL for `SUPABASE_URL`
   - Anon/Public key for `SUPABASE_ANON_KEY`

### Create Storage Bucket

1. Go to **Storage** in Supabase dashboard
2. Create a new bucket named `tryon-photos`
3. Set to **Public** if you want results to be publicly accessible
4. Configure file size limits (recommended: 5-10MB max)

---

## Step 2: Google AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key"
4. Copy the key for `GOOGLE_AI_API_KEY`

The app uses Gemini 2.5 Flash Image model which can generate virtual try-on images based on the user photo and product image inputs.

---

## Step 3: Environment Variables

Create a `.env` file in the root directory with these variables:

```bash
# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Google AI
GOOGLE_AI_API_KEY="your_key_here"

# Supabase
SUPABASE_URL="https://[PROJECT].supabase.co"
SUPABASE_ANON_KEY="your_anon_key_here"

# Shopify (these are set automatically by Shopify CLI)
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
```

---

## Step 4: Update Prisma Schema

Update `prisma/schema.prisma` to use PostgreSQL instead of SQLite:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Then add the new models for try-on functionality:

```prisma
model TryOnRequest {
  id              String    @id @default(cuid())
  shop            String
  productId       String
  productTitle    String
  productImage    String
  userPhotoUrl    String
  resultImageUrl  String?
  status          TryOnStatus @default(PENDING)
  errorMessage    String?
  metadata        Json?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([shop])
  @@index([status])
}

enum TryOnStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model AppMetadata {
  id            String   @id @default(cuid())
  shop          String   @unique
  creditsUsed   Int      @default(0)
  creditsLimit  Int      @default(10)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## Step 5: Install Dependencies

Install required packages:

```bash
# Core dependencies (already installed)
npm install

# Add new dependencies
npm install @google/generative-ai @supabase/supabase-js

# Optional: For background processing
npm install bullmq ioredis
```

---

## Step 6: Push Database Schema

```bash
# Push schema directly to database (no migration files)
npx prisma db push

# Generate Prisma client (if needed)
npx prisma generate
```

---

## Step 7: Start Development

```bash
npm run dev
```

This will:
1. Start the Shopify CLI
2. Provide you with a URL to install the app on a development store
3. Open your app in embedded mode

---

## Step 8: Test Installation

1. When prompted, select or create a development store
2. Install the app on the store
3. The app will open in the Shopify admin
4. You should see the app interface

---

## Next Steps

Follow the TODO.md file to implement:
1. AI service integration
2. Product selector UI
3. Photo upload functionality
4. Try-on generation logic
5. Results display

---

## Troubleshooting

### Database Connection Issues
- Make sure you're using the correct connection strings from Supabase
- Check that your Supabase project is active
- Verify the database is accessible (check Supabase dashboard status)

### Shopify CLI Issues
- Make sure you're logged in: `npm run shopify auth login`
- Check that your app is configured in Partners dashboard
- Verify your scopes in `shopify.app.toml`

### Prisma Issues
- Delete `node_modules/.prisma` and run `npm run prisma generate` again
- Make sure DATABASE_URL is set correctly
- Try running migrations manually: `npx prisma migrate dev`

---

## Useful Commands

```bash
# Database
npm run prisma studio              # Open database GUI
npm run prisma migrate dev         # Create and apply migration
npm run prisma generate            # Generate Prisma client
npm run prisma db push             # Push schema without migration

# Shopify
npm run dev                        # Start dev server
npm run deploy                     # Deploy to production
npm run shopify app config link    # Link to existing app

# Development
npm run lint                       # Run linter
npm run typecheck                  # Check TypeScript
```

---

## Resources

- [TODO.md](./TODO.md) - Complete implementation roadmap
- [Shopify App Dev](https://shopify.dev/docs/apps)
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Google AI Studio](https://ai.google.dev/)

