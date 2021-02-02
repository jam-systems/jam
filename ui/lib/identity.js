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
