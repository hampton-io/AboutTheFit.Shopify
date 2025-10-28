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
    
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" 
        ? ['error', 'warn', 'query'] 
        : ['error'],
    });
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
