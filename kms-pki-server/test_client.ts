import axios from 'axios';
import forge from 'node-forge';

(async () => {
  try {
    // 1. 產生 RSA Key Pair
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);

    // 2. 產生 CSR
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;
    csr.setSubject([{ name: 'commonName', value: 'testuser' }]);
    csr.sign(keys.privateKey, forge.md.sha256.create());
    const csrPem = forge.pki.certificationRequestToPem(csr);

    // 3. 註冊 CSR 並取得使用者憑證
    const registerRes = await axios.post('http://localhost:4000/api/pki/register', { csr: csrPem });
    console.log('📄 User cert obtained:');
    console.log(registerRes.data.certificate);

    // 4. 產生 session key
    const sessionKeyBytes = forge.random.getBytesSync(32); // 256-bit
    const sessionKeyBase64 = forge.util.encode64(sessionKeyBytes);

    // 5. Wrap session key
    const wrapRes = await axios.post('http://localhost:4000/api/kms/wrap', {
      userCert: registerRes.data.certificate,
      sessionKey: sessionKeyBase64,
    });
    const wrappedKey = wrapRes.data.wrappedKey;
    console.log('\n🔐 Wrapped session key (base64):', wrappedKey);

    // 6. Attempt unwrap and handle possible errors
    try {
      const unwrapRes = await axios.post('http://localhost:4000/api/kms/unwrap', { wrappedKey });
      const unwrappedBase64 = unwrapRes.data.sessionKey;
      console.log('\n🔓 Unwrapped session key (base64):', unwrappedBase64);
      const match = unwrappedBase64 === sessionKeyBase64;
      console.log(`\n✅ Session key match: ${match ? 'YES' : 'NO'}`);
    } catch (err: any) {
      console.error('\n🛑 Unwrap failed, server responded with:', err.response?.data);
    }
  } catch (err) {
    console.error('Unexpected error in test client:', err);
  }
})();
