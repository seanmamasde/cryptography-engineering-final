// src/pages/api/drive/viewEncrypted.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/server/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") return res.status(405).end();
  
  const { id } = req.query;
  
  try {
    const file = await db.driveFile.findUnique({ 
      where: { id: id as string },
      select: {
        fileName: true,
        cipher: true,
      }
    });
    
    if (!file) return res.status(404).json({ error: "File not found" });
    
    // Return the encrypted content in base64
    res.json({
      fileName: file.fileName,
      encryptedContent: file.cipher.toString('base64'),
    });
  } catch (error) {
    console.error('Error fetching encrypted content:', error);
    res.status(500).json({ error: "Failed to retrieve encrypted content" });
  }
}
