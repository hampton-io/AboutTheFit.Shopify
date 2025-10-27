import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";

// Global types for caching
const globalForPrisma = global as unknown as { 
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
}

// Lazy initialization function for the connection pool
function getPool(): Pool {
  if (!globalForPrisma.pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    // Parse connection string to log (without password)
    try {
      const url = new URL(connectionString);
      console.log('[Prisma] Initializing connection pool to:', {
        host: url.hostname,
        port: url.port,
        database: url.pathname,
        params: url.search,
      });
    } catch (e) {
      console.log('[Prisma] Initializing connection pool');
    }
    
    const pool = new Pool({ 
      connectionString,
      // Optimize for serverless - small pool per instance
      // pgbouncer handles the actual database connection pooling
      max: 1,
    });
    
    // Attach pool for proper Vercel Fluid compute handling (only on Vercel)
    if (process.env.VERCEL) {
      attachDatabasePool(pool);
    }
    
    globalForPrisma.pool = pool;
  }
  return globalForPrisma.pool;
}

// Lazy initialization of Prisma Client
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const pool = getPool();
    const adapter = new PrismaPg(pool);
    
    console.log('[Prisma] Creating PrismaClient with driver adapter');
    
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      // Always log errors, and queries in development for debugging
      log: [
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        ...(process.env.NODE_ENV === "development" ? [{ level: 'query' as const, emit: 'stdout' as const }] : [])
      ],
    });
    
    // Test the connection and session table access
    globalForPrisma.prisma.$connect()
      .then(async () => {
        console.log('[Prisma] Database connection successful');
        // Verify session model is accessible
        const sessionModel = globalForPrisma.prisma?.session;
        console.log('[Prisma] Session model accessible:', typeof sessionModel !== 'undefined');
        
        // Try to actually query the session table
        try {
          const count = await globalForPrisma.prisma?.session.count();
          console.log('[Prisma] Session table query successful, count:', count);
        } catch (err: any) {
          console.error('[Prisma] Session table query failed:', err.message);
          console.error('[Prisma] Error code:', err.code);
        }
      })
      .catch((err) => console.error('[Prisma] Database connection failed:', err.message));
  }
  return globalForPrisma.prisma;
}

// Simple Proxy for lazy initialization
// Only initializes Prisma Client when first accessed
const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = client[prop as keyof PrismaClient];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

export default prisma;

// Re-export Prisma types for use throughout the app
export { TryOnStatus } from "@prisma/client";
export type { TryOnRequest, AppMetadata, ProductTryOnSettings } from "@prisma/client";
