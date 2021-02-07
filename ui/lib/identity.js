import nacl from 'tweetnacl';
import base64 from 'compact-base64';
import {adjectives, nouns} from "./names";
import {post, put} from "../backend";

export function initializeIdentity() {
  if (!localStorage.identity) {
    const keypair = nacl.sign.keyPair();
    const identity = {
      keyPair: {
        publicKey: base64.encodeUrl(keypair.publicKey, 'binary'),
        secretKey: base64.encodeUrl(keypair.secretKey, 'binary'),
      },
      info: {
        displayName: `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`,
        email: null
      }
    };
    localStorage.identity = JSON.stringify(identity);
    post(signedToken(), `/identities/${identity.keyPair.publicKey}`, identity.info);
  }
}

export function getId() {
  return JSON.parse(localStorage.identity).keyPair.publicKey;
}

export function getInfo() {
  const info = JSON.parse(localStorage.identity).info;
  return {
    ...info,
    id: getId()
  };
}

export async function updateInfo(info) {
  const identity = JSON.parse(localStorage.identity);
  identity.info = info;
  identity.info.id = undefined;
  localStorage.identity = JSON.stringify(identity);
  if(!(await put(signedToken(), `/identities/${identity.keyPair.publicKey}`, identity.info))) {
    post(signedToken(), `/identities/${identity.keyPair.publicKey}`, identity.info);
  }
}


export function sign(data) {
  const secretKeyB64 = JSON.parse(localStorage.identity).keyPair.secretKey;
  const secretKey = Uint8Array.from(base64.decodeUrl(secretKeyB64, 'binary'));
  return base64.encodeUrl(nacl.sign(data, secretKey), 'binary');
}

// TODO
function signedToken() {
  const dateToken = Math.round(Date.now() / 30000);
  const signData = Uint8Array.of(
      dateToken % 256,
      (dateToken >> 8) % 256,
      (dateToken >> 16) % 256,
      (dateToken >> 24) % 256
  );
  return sign(signData);
}

