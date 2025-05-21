import { NextApiRequest, NextApiResponse } from "next";
import forge from "node-forge";
import { SECRET, issueToken } from "@/lib/rbac";

const ca = forge.pki.createCertificate(); // self-signed CA when server starts
ca.publicKey = forge.pki.rsa.generateKeyPair(2048).publicKey;
ca.serialNumber = "01";
ca.validity.notBefore = new Date();
ca.validity.notAfter = new Date(
  new Date().setFullYear(ca.validity.notBefore.getFullYear() + 1),
);
ca.setSubject([{ name: "commonName", value: "Demo CA" }]);
ca.setIssuer(ca.subject.attributes);
ca.sign(
  forge.pki.privateKeyFromPem(
    forge.pki.privateKeyToPem(forge.pki.rsa.generateKeyPair(2048).privateKey),
  ),
);

const certStore: Record<string, string> = {}; // email ➜ PEM

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const [, action, email] = req.query.slug as string[];
  if (action === "register" && req.method === "POST") {
    const { jwk } = req.body;
    const pub = await crypto.subtle.importKey(
      "jwk",
      JSON.parse(jwk),
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"],
    );
    const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pub));
    const asn1Obj = forge.asn1.fromDer(forge.util.createBuffer(spki));
    const pem = forge.pki.publicKeyToPem(forge.pki.publicKeyFromAsn1(asn1Obj));
    const cert = forge.pki.createCertificate();
    cert.publicKey = forge.pki.publicKeyFromPem(pem);
    cert.serialNumber = (Math.random() * 1e6).toString();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date(
      new Date().setFullYear(cert.validity.notBefore.getFullYear() + 1),
    );
    cert.setSubject([{ name: "commonName", value: email }]);
    cert.setIssuer(ca.subject.attributes);
    cert.sign(
      forge.pki.privateKeyFromPem(forge.pki.privateKeyToPem(ca.privateKey)),
    );
    const pemCert = forge.pki.certificateToPem(cert);
    certStore[email!] = pemCert;
    // give user a “role” claim = product-dev if email ends with “carol@…”
    const role = email!.includes("carol")
      ? "prod-dev"
      : email!.includes("bob")
      ? "marketing"
      : "prod-dev";
    return res.json({
      pem: pemCert,
      token: issueToken({ email: email!, role }),
    });
  }
  if (action === "cert" && email) {
    return certStore[email]
      ? res.json({ pem: certStore[email] })
      : res.status(404).json({ err: "no cert" });
  }
  res.status(404).end();
}
