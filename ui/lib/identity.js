import nacl from 'tweetnacl';
import base64 from 'compact-base64';

// if (import.meta.hot) import.meta.hot.decline();
if (!sessionStorage.identity) {
  const keypair = nacl.sign.keyPair();
  console.log(keypair);
  sessionStorage.identity = JSON.stringify(
      {
                publicKey: base64.encodeUrl(keypair.publicKey, 'binary'),
                secretKey: base64.encodeUrl(keypair.secretKey, 'binary')
            });
}

export function getId() {
    return JSON.parse(sessionStorage.identity).publicKey;
}

export function sign(data) {
    const secretKeyB64 = JSON.parse(sessionStorage.identity).secretKey
    const secretKey = Uint8Array.from(base64.decodeUrl(secretKeyB64, 'binary'));
    return base64.encodeUrl(nacl.sign(data, secretKey), 'binary');
}
