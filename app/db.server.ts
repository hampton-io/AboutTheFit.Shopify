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

// Lazy initialization of Prisma Client
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const pool = getPool();
    const adapter = new PrismaPg(pool);
    
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

// Export a Proxy that lazily initializes the Prisma Client
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient();
    return client[prop as keyof PrismaClient];
  }
})

export default prisma;

// Re-export Prisma types for use throughout the app
export { TryOnStatus } from "@prisma/client";
export type { TryOnRequest, AppMetadata, ProductTryOnSettings } from "@prisma/client";
