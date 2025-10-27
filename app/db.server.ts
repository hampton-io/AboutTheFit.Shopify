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
    
    // Test the connection immediately
    globalForPrisma.prisma.$connect()
      .then(() => console.log('[Prisma] Database connection successful'))
      .catch((err) => console.error('[Prisma] Database connection failed:', err.message));
  }
  return globalForPrisma.prisma;
}

// For PrismaSessionStorage compatibility, we need to return the actual client
// The lazy initialization happens on first property access
let exportedClient: PrismaClient | undefined;

const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!exportedClient) {
      exportedClient = getPrismaClient();
      console.log('[Prisma] Client initialized and cached');
    }
    const value = exportedClient[prop as keyof PrismaClient];
    return value;
  },
  // Handle property checks like 'session' in prisma
  has(target, prop) {
    if (!exportedClient) {
      exportedClient = getPrismaClient();
    }
    return prop in exportedClient;
  },
  // Handle Object.keys and property enumeration
  ownKeys(target) {
    if (!exportedClient) {
      exportedClient = getPrismaClient();
    }
    return Reflect.ownKeys(exportedClient);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (!exportedClient) {
      exportedClient = getPrismaClient();
    }
    return Reflect.getOwnPropertyDescriptor(exportedClient, prop);
  }
})

export default prisma;

// Re-export Prisma types for use throughout the app
export { TryOnStatus } from "@prisma/client";
export type { TryOnRequest, AppMetadata, ProductTryOnSettings } from "@prisma/client";
