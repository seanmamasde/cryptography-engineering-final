import { NextApiRequest, NextApiResponse } from "next";
import { requireRole } from "@/lib/rbac";

type KeyRecord = { wrappedKey: string; roles: string[] };
const keyDB = new Map<string, KeyRecord>(); // fileId ➜ record

export const config = { api: { bodyParser: true } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const [, action, fileId] = req.query.slug as string[];
  if (action === "register" && req.method === "POST") {
    const { wrappedKey, roles } = req.body as KeyRecord;
    keyDB.set(fileId!, { wrappedKey, roles });
    return res.json({ ok: true });
  }
  if (action === "unwrap" && fileId) {
    const rec = keyDB.get(fileId);
    if (!rec) return res.status(404).json({ err: "missing key" });
    const role = (req as any).user?.role;
    if (!rec.roles.includes(role))
      return res.status(403).json({ err: "role denied" });
    return res.json({ wrappedKey: rec.wrappedKey });
  }
  res.status(404).end();
}

// Apply RBAC globally
export const middleware = requireRole("*"); // '*' bypass in demo, tighten as needed
