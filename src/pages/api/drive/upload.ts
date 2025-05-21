// src/pages/api/drive/upload.ts ---------------------------------
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/server/db";
import { database } from "@/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();

  const body = JSON.parse(req.body);
  const { fileName, cipher, iv, tag, keyId, ownerEmail } = body;

  const driveFile = await db.driveFile.create({
    data: {
      fileName,
      cipher: Buffer.from(cipher, "base64"),
      iv,
      tag,
      keyId,
      ownerEmail,
    },
  });
  await setDoc(
    doc(database, "files", driveFile.id), // custom doc-id = DriveFile.id
    {
      fileName,
      fileExtension: fileName.split(".").pop()?.toLowerCase() ?? "",
      isFolder: false,
      isStarred: false,
      isTrashed: false,
      folderId: "", // or Folder?.[1] if you support nesting
      userEmail: ownerEmail,
      /* allow existing UI to keep using these fields */
      // open/download now use file.id so we don't need fileLink any more
    },
  );
  res.status(200).end();
}
