/** Very dumb in-memory store: { id: { key, iv, tag } } */

import { randomUUID } from "node:crypto";

type Rec = { key: Buffer; iv: Buffer; tag: Buffer };
const db = new Map<string, Rec>();

export function save(rec: Rec) {
  const id = randomUUID();
  db.set(id, rec);
  return id;
}

export function get(id: string): Rec | undefined {
  return db.get(id);
}

export function remove(id: string) {
  db.delete(id);
}
