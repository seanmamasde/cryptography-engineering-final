import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function initializeDatabase() {
  console.log("🗄️ Initializing database...");
  
  try {
    // Run Prisma migrations
    await execAsync("npx prisma migrate deploy");
    console.log("✅ Database migrations applied successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    return false;
  }
}
