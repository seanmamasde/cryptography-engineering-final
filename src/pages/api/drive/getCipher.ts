// src/pages/api/drive/getCipher.ts ------------------------------
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/server/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") return res.status(405).end();
  const { id } = req.query;
  const row = await db.driveFile.findUnique({ where: { id: id as string } });
  if (!row) return res.status(404).end();

  res.json({
    cipher: row.cipher.toString("base64"),
    iv: row.iv,
    tag: row.tag,
    keyId: row.keyId,
    fileName: row.fileName,
  });
}
