import express from "express";
import cors from "cors";
import multer from "multer";
import morgan from "morgan";
import { encrypt, decrypt } from "./crypto";
import { save, get } from "./store";

const upload = multer(); // memory storage
const app = express();
app.use(morgan("dev"));
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));

/* ---------- POST /encrypt ----------
   Body: multipart/form-data  field "file"
   Returns: { keyId, iv, tag, cipher }   (all base64)
------------------------------------ */
app.post("/encrypt", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("file missing");

  const { key, iv, tag, encrypted } = encrypt(req.file.buffer);
  const keyId = save({ key, iv, tag });
  console.log(
    `🔐  Encrypted ${req.file.originalname} (${req.file.size} B)` +
      `  → keyId ${keyId}  cipher ${encrypted.length} B`,
  );

  res.json({
    keyId,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    cipher: encrypted.toString("base64"),
  });
});

/* ---------- GET /key/:keyId ----------
   Returns the raw AES key as base64 (demo only!)             */
app.get("/key/:keyId", (req, res) => {
  const rec = get(req.params.keyId);
  if (!rec) return res.status(404).send("key not found");
  console.log(`🔑  Key fetch for ${req.params.keyId}`);
  res.json({ key: rec.key.toString("base64") });
});

/* ---------- POST /decrypt ----------
   Body: { keyId, iv, tag, cipher }  (base64)
   Returns: raw file as octet-stream                           */
app.post("/decrypt", express.json({ limit: "50mb" }), (req, res) => {
  const { keyId, iv, tag, cipher } = req.body;
  const rec = get(keyId);
  if (!rec) return res.status(404).send("key not found");

  const plain = decrypt(
    Buffer.from(cipher, "base64"),
    rec.key,
    Buffer.from(iv, "base64"),
    Buffer.from(tag, "base64"),
  );
  console.log(
    `📤  Decrypt request ${(cipher.length / 4) * 3} B  with keyId ${keyId}`,
  );
  res.setHeader("Content-Type", "application/octet-stream");
  res.send(plain);
});

app.listen(4000, () => console.log("🔑  Demo KMS running on :4000"));
