import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import forge from 'node-forge';
import fs from 'fs';

const pki = forge.pki;

const CA_KEY_PATH = './ca.key.pem';
const CA_CERT_PATH = './ca.cert.pem';
let caPrivateKey: forge.pki.PrivateKey;
let caCertificate: forge.pki.Certificate;

function initCA() {
  // 檔案已經存在 → 直接讀取並由 PEM 解析成 forge 物件
  if (fs.existsSync(CA_KEY_PATH) && fs.existsSync(CA_CERT_PATH)) {
    const keyPem = fs.readFileSync(CA_KEY_PATH, 'utf8');
    const certPem = fs.readFileSync(CA_CERT_PATH, 'utf8');
    caPrivateKey = pki.privateKeyFromPem(keyPem);
    caCertificate = pki.certificateFromPem(certPem);
    console.log('Loaded existing CA key & cert');
  } else {// 檔案不存在 → 生成新的 RSA key pair
    const keys = pki.rsa.generateKeyPair(2048);
    caPrivateKey = keys.privateKey;
    // 建立空白憑證並填入資訊
    const cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
    // 主體與簽發者相同
    const attrs = [{ name: 'commonName', value: 'MyRootCA' }];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    // 這是 CA 憑證，需要有簽發子憑證的權限
    cert.setExtensions([
      { name: 'basicConstraints', cA: true },
      { name: 'keyUsage', keyCertSign: true, cRLSign: true },
    ]);
    // 用私鑰簽章
    cert.sign(caPrivateKey, forge.md.sha256.create());
    caCertificate = cert;
    // 把私鑰與憑證寫到檔案，下次可直接載入
    fs.writeFileSync(CA_KEY_PATH, pki.privateKeyToPem(caPrivateKey));
    fs.writeFileSync(CA_CERT_PATH, pki.certificateToPem(caCertificate));
    console.log('Created new CA key & cert');
  }
}

// 初始化 CA，確保 CA 已經就緒
initCA();

// 建立 Express 應用並啟用 JSON 解析中介軟體
const app = express();
app.use(bodyParser.json());

// 提供 CA 憑證給外界下載
app.get(
  '/api/pki/ca-cert',
  (_req: Request, res: Response, _next: NextFunction) => {
    res
      .type('application/x-pem-file')
      .send(pki.certificateToPem(caCertificate));
    return;
  }
);

// 註冊 CSR 並簽發使用者憑證
app.post(
  '/api/pki/register',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const csrPem: string = req.body.csr;
      const csr = pki.certificationRequestFromPem(csrPem);
      // 驗證 CSR 是否有效
      if (!csr.verify()) {
        res.status(400).json({ error: 'CSR verification failed' });
        return;
      }
      // 確認 publicKey 存在
      if (!csr.publicKey) {
        res.status(400).json({ error: 'CSR missing publicKey' });
        return;
      }
      // 建立使用者憑證，並以 CA 私鑰簽章
      const userCert = pki.createCertificate();
      userCert.serialNumber = Date.now().toString();
      userCert.publicKey = csr.publicKey;
      userCert.validity.notBefore = new Date();
      userCert.validity.notAfter = new Date();
      userCert.validity.notAfter.setFullYear(
        userCert.validity.notBefore.getFullYear() + 1
      );
      userCert.setSubject(csr.subject.attributes);
      userCert.setIssuer(caCertificate.subject.attributes);
      userCert.setExtensions([
        { name: 'basicConstraints', cA: false },
        { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      ]);
      userCert.sign(caPrivateKey, forge.md.sha256.create());
      const certPem = pki.certificateToPem(userCert);
      res.json({ certificate: certPem });
      return;
    } catch (err) {
      next(err);
    }
  }
);

// 包裝 session key（使用 CA 公鑰加密），封裝（加密）對稱 session key
app.post(
  '/api/kms/wrap',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionKeyBase64: string = req.body.sessionKey;
      const sessionKeyBytes = forge.util.decode64(sessionKeyBase64);
      // 用 CA 憑證（公鑰）加密 session key
      const encrypted = (
        caCertificate.publicKey as unknown as forge.pki.rsa.PublicKey
      ).encrypt(sessionKeyBytes, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
      });
      const encrypted64 = forge.util.encode64(encrypted);
      res.json({ wrappedKey: encrypted64 });
      return;
    } catch (err) {
      next(err);
    }
  }
);

// 解包 session key（使用 CA 私鑰解密）
app.post(
  '/api/kms/unwrap',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const wrappedKey: string = req.body.wrappedKey;
      const wrappedBytes = forge.util.decode64(wrappedKey);
      // 用 CA 私鑰解密
      const decrypted = (
        caPrivateKey as unknown as forge.pki.rsa.PrivateKey
      ).decrypt(wrappedBytes, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
      });
      const idKey = forge.util.encode64(decrypted);
      res.json({ sessionKey: idKey });
      return;
    } catch (err) {
      // 解密失敗回 403
      res.status(403).json({ error: 'Unwrap failed' });
      return;
    }
  }
);

// 啟動伺服器
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`KMS PKI service running on port ${PORT}`));
