import { PrismaClient } from "@prisma/client";

// Recommended pattern from Prisma React Router 7 docs
// https://www.prisma.io/docs/guides/react-router-7
const globalForPrisma = global as unknown as { 
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
})

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export default prisma;

// Re-export Prisma types for use throughout the app
export { TryOnStatus } from "@prisma/client";
export type { TryOnRequest, AppMetadata, ProductTryOnSettings } from "@prisma/client";
