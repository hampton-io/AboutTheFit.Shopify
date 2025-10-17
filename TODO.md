# About the Fit - Virtual Try-On Shopify App

## Project Overview
A Shopify app that allows store customers to upload their photo and visualize how clothing items would look on them using Google's Generative AI (Gemini).

---

## Phase 1: Infrastructure Setup

### 1.1 Database Configuration
- [ ] Get Supabase PostgreSQL connection string (from Supabase dashboard > Project Settings > Database)
- [ ] Update `prisma/schema.prisma` datasource to use PostgreSQL
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  ```
- [ ] Add `DATABASE_URL` to environment variables (`.env` file)
- [ ] Create `.env` file with:
  ```
  DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]?pgbouncer=true&connection_limit=1"
  DIRECT_URL="postgresql://[user]:[password]@[host]:[port]/[database]"
  ```

### 1.2 Database Schema Design
- [ ] Create database schema in `prisma/schema.prisma`:
  - **TryOnRequest** model
    - id (String, @id @default(cuid()))
    - shop (String - which store the request came from)
    - productId (String - Shopify product ID)
    - productTitle (String)
    - productImage (String - URL)
    - userPhotoUrl (String - uploaded photo)
    - resultImageUrl (String? - generated result)
    - status (Enum: PENDING, PROCESSING, COMPLETED, FAILED)
    - errorMessage (String?)
    - createdAt (DateTime @default(now()))
    - updatedAt (DateTime @updatedAt)
  - **AppMetadata** model (for storing config/settings)
    - id (String, @id @default(cuid()))
    - shop (String @unique)
    - creditsUsed (Int @default(0))
    - creditsLimit (Int @default(10))
    - isActive (Boolean @default(true))

### 1.3 Push Database Schema
- [ ] Run `npx prisma db push` to sync schema to database
- [ ] Verify tables created in Supabase dashboard
- [ ] Run `npx prisma generate` to update Prisma client (if needed)

### 1.4 Google AI API Setup
- [ ] Get Google AI API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- [ ] Add to `.env`: `GOOGLE_AI_API_KEY=your_key_here`
- [ ] Install required package: `npm install @google/generative-ai`
- [ ] Test API key with a simple generation request
- [ ] Monitor usage and costs in Google AI Studio dashboard

### 1.5 File Storage Setup
- [ ] Set up Supabase Storage bucket for user photos
- [ ] Create bucket: `tryon-photos` (public or private depending on requirements)
- [ ] Add Supabase storage credentials to `.env`:
  ```
  SUPABASE_URL=your_supabase_url
  SUPABASE_ANON_KEY=your_anon_key
  ```
- [ ] Install Supabase client: `npm install @supabase/supabase-js`

---

## Phase 2: Backend Implementation

### 2.1 Create AI Service
- [ ] Create `app/services/ai.server.ts` based on prototype
- [ ] Implement `VirtualTryOnAI` class with:
  - `generateTryOn(request: TryOnRequest)` method
  - Error handling for API failures
  - Image conversion utilities
  - Result parsing and validation
- [ ] Add proper TypeScript types for AI responses

### 2.2 Create Storage Service
- [ ] Create `app/services/storage.server.ts`
- [ ] Implement functions:
  - `uploadUserPhoto(file: File, shop: string): Promise<string>` - returns URL
  - `deleteUserPhoto(url: string): Promise<void>`
  - `getSignedUrl(path: string): Promise<string>` - for temporary access

### 2.3 Create Try-On Processing Service
- [ ] Create `app/services/tryon.server.ts`
- [ ] Implement functions:
  - `createTryOnRequest(data)` - save to database
  - `processTryOnRequest(requestId)` - call AI service
  - `updateTryOnStatus(requestId, status, result)` - update database
  - `getTryOnRequest(requestId)` - fetch from database
  - `listTryOnRequests(shop)` - list all requests for a shop

### 2.4 Create Product Service
- [ ] Create `app/services/products.server.ts`
- [ ] Implement GraphQL queries:
  - `getProduct(admin, productId)` - fetch single product with images
  - `getProducts(admin, query?)` - fetch multiple products with pagination
  - `getProductImage(admin, productId)` - get primary product image

---

## Phase 3: API Routes

### 3.1 Try-On Request Route
- [ ] Create `app/routes/api.tryon.create.tsx` (POST)
  - Accept: productId, userPhotoFile (multipart/form-data)
  - Validate user photo (file size, type)
  - Upload photo to Supabase Storage
  - Fetch product details from Shopify
  - Create database record
  - Trigger background processing (or process immediately)
  - Return: requestId

### 3.2 Try-On Status Route
- [ ] Create `app/routes/api.tryon.$id.tsx` (GET)
  - Fetch request by ID from database
  - Return: status, resultImageUrl, error

### 3.3 Try-On List Route
- [ ] Create `app/routes/api.tryon.list.tsx` (GET)
  - Fetch all try-on requests for the authenticated shop
  - Support pagination
  - Return: array of requests

### 3.4 Product Search Route
- [ ] Create `app/routes/api.products.search.tsx` (GET)
  - Accept: query parameter
  - Use Shopify GraphQL to search products
  - Filter for products with images
  - Return: products array with id, title, images

---

## Phase 4: Frontend UI

### 4.1 Main Try-On Page
- [ ] Replace `app/routes/app._index.tsx` with try-on interface
- [ ] Components needed:
  - Product selector (autocomplete/search)
  - Photo upload area (drag & drop)
  - Preview of selected product
  - Preview of uploaded photo
  - "Generate Try-On" button
  - Results display area (2x2 grid)
  - Loading state with progress indicator
  - Error state with retry option

### 4.2 Product Selector Component
- [ ] Create `app/components/ProductSelector.tsx`
- [ ] Use Polaris components:
  - `<s-autocomplete>` for product search
  - `<s-thumbnail>` for product image preview
- [ ] Fetch products from API route
- [ ] Display product title, image, and ID

### 4.3 Photo Upload Component
- [ ] Create `app/components/PhotoUpload.tsx`
- [ ] Features:
  - Drag & drop zone
  - File input button
  - Image preview
  - File validation (max size, accepted types: jpg, png)
  - Crop/resize functionality (optional but recommended)
- [ ] Use `<s-dropzone>` or custom component

### 4.4 Results Display Component
- [ ] Create `app/components/TryOnResults.tsx`
- [ ] Display 2x2 grid of generated images
- [ ] Add download/share buttons
- [ ] Show metadata (product name, generation time)

### 4.5 History/Gallery View
- [ ] Create `app/routes/app.history.tsx`
- [ ] Display list of previous try-on requests
- [ ] Filter by product, date
- [ ] Click to view full results
- [ ] Delete option

---

## Phase 5: Background Processing (Optional but Recommended)

### 5.1 Job Queue Setup
- [ ] Install job queue library: `npm install bullmq ioredis`
- [ ] Set up Redis (can use Upstash or Supabase Redis)
- [ ] Add Redis URL to `.env`: `REDIS_URL=your_redis_url`

### 5.2 Worker Implementation
- [ ] Create `app/workers/tryon.worker.ts`
- [ ] Process try-on requests asynchronously
- [ ] Handle retries on failure
- [ ] Update database on completion/failure

### 5.3 Webhook for Status Updates
- [ ] Create `app/routes/webhooks.tryon.status.tsx`
- [ ] Allow frontend to poll for status updates
- [ ] Or implement WebSocket for real-time updates

---

## Phase 6: App Billing (Optional)

### 6.1 Configure App Pricing
- [ ] Decide on pricing model:
  - Free tier: 5 try-ons per month
  - Paid tier: $9.99/month for 100 try-ons
  - Or usage-based pricing
- [ ] Configure in `shopify.app.toml`

### 6.2 Implement Billing Check
- [ ] Create `app/services/billing.server.ts`
- [ ] Check credits before allowing try-on
- [ ] Implement usage tracking
- [ ] Handle subscription webhooks

---

## Phase 7: Shopify App Store Listing

### 7.1 App Configuration
- [ ] Update `shopify.app.toml` with:
  - App name: "About the Fit - Virtual Try-On"
  - Description
  - Required scopes: `read_products`
  - Embedded: true
- [ ] Configure app URL and redirect URLs

### 7.2 App Scopes
- [x] ✅ Scopes already configured in `shopify.app.toml`:
  - `read_products` - Only scope needed to fetch product details and images
- Note: No write permissions needed since images are stored in Supabase

### 7.3 App Testing
- [ ] Test installation flow
- [ ] Test with multiple products
- [ ] Test error scenarios (API failures, invalid images)
- [ ] Test on different browsers
- [ ] Test mobile responsive design

### 7.4 Prepare App Store Assets
- [ ] Create app icon (512x512)
- [ ] Create screenshots (1280x800)
- [ ] Write app description
- [ ] Create demo video (optional but recommended)
- [ ] Prepare privacy policy and terms of service

---

## Phase 8: Deployment

### 8.1 Environment Variables
- [ ] Set all environment variables in production:
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `GOOGLE_AI_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SHOPIFY_API_KEY`
  - `SHOPIFY_API_SECRET`
  - `REDIS_URL` (if using job queue)

### 8.2 Deploy Application
- [ ] Choose hosting platform:
  - Shopify's default (Spin/Oxygen)
  - Railway
  - Render
  - Fly.io
  - Or Docker deployment
- [ ] Run database migrations in production
- [ ] Test deployment with development store

### 8.3 Monitor and Log
- [ ] Set up error tracking (Sentry, Bugsnag)
- [ ] Set up logging (Winston, Pino)
- [ ] Monitor API usage and costs
- [ ] Set up alerts for failures

---

## Phase 9: Polish and Optimization

### 9.1 Performance
- [ ] Optimize image uploads (compress, resize on client)
- [ ] Add caching for product data
- [ ] Optimize database queries
- [ ] Add loading states everywhere

### 9.2 User Experience
- [ ] Add helpful tooltips and instructions
- [ ] Add example/demo mode with sample images
- [ ] Add "before/after" comparison view
- [ ] Add social sharing features

### 9.3 Analytics
- [ ] Track usage metrics:
  - Number of try-ons per shop
  - Success/failure rates
  - Popular products
  - User engagement
- [ ] Use Shopify Analytics or custom solution

---

## Phase 10: Launch Checklist

- [ ] All tests passing
- [ ] Database migrations run successfully
- [ ] Environment variables configured
- [ ] App store listing complete
- [ ] Privacy policy and terms published
- [ ] Support email/contact configured
- [ ] Monitoring and alerts active
- [ ] Documentation complete
- [ ] Marketing materials ready
- [ ] Submit app for review

---

## Important Notes

### AI Model Selection
The app uses **Gemini 2.5 Flash Image** (`gemini-2.5-flash-image`) which can generate images based on your prompt and input images. This model is:
- Fast and cost-effective
- Handles multi-modal input (text + images)
- Good for prototyping and production
- May require prompt tuning for optimal results

For production improvements, you may want to:
- Fine-tune prompts for better results
- Add result quality validation
- Implement fallback strategies
- Consider specialized virtual try-on models if quality isn't sufficient

### File Storage Best Practices
- Store original user photos temporarily (delete after 7 days)
- Store generated results longer (30+ days)
- Use Supabase Storage for simplicity, or S3 for scale
- Implement proper access controls

### Cost Considerations
- Google AI API: ~$0.001-0.01 per request (Gemini 2.5 Flash Image)
- Storage: Minimal cost with Supabase free tier (~$0.001 per image)
- Estimated cost per try-on: $0.01-0.02
- Monitor actual costs in Google AI Studio

### Security
- Validate all file uploads (size, type, content)
- Use signed URLs for user photos
- Rate limit API endpoints
- Sanitize all user inputs
- Follow Shopify's security best practices

---

## Quick Start Commands

```bash
# Install dependencies
npm install

# Set up database
npm run prisma migrate dev

# Generate Prisma client
npm run prisma generate

# Start development server
npm run dev

# Deploy to production
npm run deploy
```

---

## Support and Resources

- [Shopify App Documentation](https://shopify.dev/docs/apps)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Google AI Studio](https://ai.google.dev/)
- [Replicate Documentation](https://replicate.com/docs)

