// src/pages/api/system/db-status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/server/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    // Try a simple query to check if the database is working
    // This will throw if the DriveFile table doesn't exist
    await db.driveFile.count();
    
    return res.status(200).json({ 
      status: "ok",
      message: "Database is properly initialized and DriveFile table exists"
    });
  } catch (error) {
    console.error("Database check failed:", error);
    return res.status(500).json({ 
      status: "error",
      message: "Database check failed. Tables may not be initialized.",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
