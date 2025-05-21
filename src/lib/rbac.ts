import jwt from "jsonwebtoken";
import { NextApiRequest, NextApiResponse } from "next";
export const SECRET = "demo-only";

export interface UserJwt {
  email: string;
  role: string;
}
export function issueToken(u: UserJwt) {
  return jwt.sign(u, SECRET, { expiresIn: "1h" });
}

export function requireRole(role: string) {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      const tok = (req.headers.authorization ?? "").replace("Bearer ", "");
      const payload = jwt.verify(tok, SECRET) as UserJwt;
      if (payload.role !== role)
        return res.status(403).json({ err: "forbidden" });
      (req as any).user = payload;
      next();
    } catch {
      return res.status(401).json({ err: "unauth" });
    }
  };
}
