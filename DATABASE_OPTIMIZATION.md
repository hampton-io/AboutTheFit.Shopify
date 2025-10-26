# Database Connection Optimization for Vercel

## Problem
Previously, the database connection pool was being initialized immediately when `db.server.ts` was imported, even for requests that never touched the database (like 404 pages). This happened because:

1. `entry.server.tsx` imports `shopify.server.ts` for every request
2. `shopify.server.ts` imports `db.server.ts` 
3. The old `db.server.ts` created the connection pool at module load time

This caused unnecessary database connections for:
- 404 pages
- Static asset requests
- Health checks
- Any request that ultimately didn't need the database

## Solution: Lazy Initialization

We implemented **lazy initialization** using a JavaScript Proxy pattern:

```typescript
// Connection pool and Prisma Client are only created when first accessed
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient(); // Lazy initialization here
    return client[prop as keyof PrismaClient];
  }
})
```

### How It Works

1. **Import time**: When `db.server.ts` is imported, NO database connection is created
2. **First use**: When code tries to use `prisma.someModel.query()`, the Proxy intercepts it
3. **Initialization**: Only then does it create the Pool, adapter, and Prisma Client
4. **Caching**: Subsequent uses reuse the same connection pool

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

