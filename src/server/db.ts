import { PrismaClient } from "@prisma/client";
import { initializeDatabase } from "./db-init";
import { env } from "@/env.mjs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  isDbInitialized: boolean | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Initialize database if not already done
if (!globalForPrisma.isDbInitialized) {
  // We run this in the background to avoid blocking app startup
  initializeDatabase()
    .then((success) => {
      globalForPrisma.isDbInitialized = success;
    })
    .catch((error) => {
      console.error("Failed to initialize database:", error);
      globalForPrisma.isDbInitialized = false;
    });
}

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
