# Database Connection Optimization for Vercel

## Problem
Previously, the database connection pool was being initialized immediately when `db.server.ts` was imported, even for requests that never touched the database (like the landing page and 404s). This happened because:

1. `entry.server.tsx` called `addDocumentResponseHeaders()` for **every** request
2. This triggered `shopify.server.ts` to initialize `shopifyApp()` at module load
3. `shopifyApp()` creates `PrismaSessionStorage` which immediately queries the database (`prisma.session.count()`)
4. The old `db.server.ts` created the connection pool at module load time

This caused unnecessary database connections for:
- Landing page (`/`)
- Privacy and Terms pages
- 404 pages
- Static asset requests
- Health checks
- Any request that didn't need Shopify authentication

## Solution: Multi-Layer Lazy Initialization

We implemented **three layers of lazy initialization**:

### Layer 1: Lazy Prisma Client (db.server.ts)

```typescript
// Connection pool and Prisma Client are only created when first accessed
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient(); // Lazy initialization here
    return client[prop as keyof PrismaClient];
  }
})
```

### Layer 2: Lazy Shopify App (shopify.server.ts)

```typescript
// Shopify app (including PrismaSessionStorage) only created when needed
let shopify: ReturnType<typeof shopifyApp> | undefined;

function getShopify() {
  if (!shopify) {
    shopify = shopifyApp({
      sessionStorage: new PrismaSessionStorage(prisma), // Triggers DB on first call
      // ... other config
    });
  }
  return shopify;
}

export const authenticate = (...args) => getShopify().authenticate(...args);
export const login = (...args) => getShopify().login(...args);
// ... other exports
```

### Layer 3: Conditional Header Addition (entry.server.tsx)

```typescript
// Only call Shopify functions for app routes
const isAppRoute = url.pathname.startsWith('/app') || url.pathname.startsWith('/auth');

if (isAppRoute) {
  addDocumentResponseHeaders(request, responseHeaders);
}
```

### How It Works

1. **Landing page request** (`/`):
   - `entry.server.tsx` skips `addDocumentResponseHeaders` ✅
   - No Shopify app initialization ✅
   - No database connection ✅

2. **App route request** (`/app`):
   - `entry.server.tsx` calls `addDocumentResponseHeaders` 
   - This calls `getShopify()` → initializes Shopify app
   - `PrismaSessionStorage` created → triggers `getPrismaClient()`
   - Database connection pool created on first query ✅

3. **Subsequent requests**:
   - Reuses cached Shopify app and Prisma Client ✅

## Benefits

✅ **Reduced cold starts** - 404s and static requests don't initialize DB connections  
✅ **Lower connection usage** - Only creates connections when actually needed  
✅ **Better serverless performance** - Faster response times for non-DB requests  
✅ **Cost savings** - Fewer wasted connections to your database  
✅ **Backward compatible** - All existing code works without changes  

## Modern Vercel + Prisma Setup

Our implementation now follows Prisma's latest best practices for Vercel:

1. ✅ Using `engineType = "client"` - No Rust binaries (GA since v6.16.0)
2. ✅ Using `@prisma/adapter-pg` - Native PostgreSQL driver
3. ✅ Using `attachDatabasePool()` - Proper Vercel Fluid compute support (only on Vercel)
4. ✅ Lazy initialization - Prevents unnecessary connections
5. ✅ Connection pooling - Efficient serverless connection management
6. ✅ Environment-aware - Only enables Vercel-specific features when deployed

## References

- [Prisma Vercel Deployment Guide](https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel)
- [Prisma without Rust Binaries](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client#using-prisma-orm-without-rust-binaries)
- [Vercel Fluid Compute](https://vercel.com/docs/functions/runtimes)

## Troubleshooting

### WASM Error

If you see this error after updating to `engineType = "client"`:
```
ENOENT: no such file or directory, open '/var/task/node_modules/.prisma/client/query_compiler_bg.wasm'
```

This means the old Prisma Client cache needs to be cleared:
```bash
rm -rf node_modules/.prisma
npx prisma generate
npm run build
```

The new `engineType = "client"` doesn't use WASM files, so this error indicates stale cached files.

### "Session table does not exist" Error

If you see `MissingSessionTableError` even though the table exists in your database:

**Possible causes:**

1. **Connection pooling with transactions** - Some Prisma operations require session-level features that pgbouncer in transaction mode doesn't support. For driver adapters, you should use `DATABASE_URL` with pgbouncer in **session mode** or use `DIRECT_URL`.

2. **Schema not specified** - Ensure your connection string includes the schema if not using the default `public` schema.

3. **Table name mismatch** - Verify the table is named `session` (lowercase) in your database.

**Quick fix for Vercel:**
Ensure both environment variables are set:
- `DATABASE_URL` - Your pooled connection (for most operations)
- `DIRECT_URL` - Direct connection (for migrations and schema introspection)

## Implementation Details

Key aspects of the implementation in `app/db.server.ts`:

```typescript
function getPool(): Pool {
  if (!globalForPrisma.pool) {
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL 
    });
    
    // Attach pool for proper Vercel Fluid compute handling (only on Vercel)
    if (process.env.VERCEL) {
      attachDatabasePool(pool);
    }
    
    globalForPrisma.pool = pool;
  }
  return globalForPrisma.pool;
}
```

### Why Check `process.env.VERCEL`?

While `attachDatabasePool()` has internal checks and is safe to call anywhere, we explicitly guard it because:
- **Clearer intent** - Makes it obvious this is Vercel-specific functionality
- **Avoid overhead** - Skips event listener setup in local development
- **Better DX** - Code is more self-documenting
- **Defensive coding** - Prevents potential edge cases in pool type detection

