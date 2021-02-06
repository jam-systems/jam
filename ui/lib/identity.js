import nacl from 'tweetnacl';
import base64 from 'compact-base64';
import {adjectives, nouns} from "./names";
import State from "./minimal-state";

if (!localStorage.identity) {
  const keypair = nacl.sign.keyPair();
  localStorage.identity = JSON.stringify({
    keyPair: {
      publicKey: base64.encodeUrl(keypair.publicKey, 'binary'),
      secretKey: base64.encodeUrl(keypair.secretKey, 'binary'),
    },
    info: {
      displayName: `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`,
      email: null
    }
  });
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

export function updateInfo(info) {
  const identity = JSON.parse(localStorage.identity);
  identity.info = info;
  identity.info.id = undefined;
  localStorage.identity = JSON.stringify(identity);
}


export function sign(data) {
  const secretKeyB64 = JSON.parse(localStorage.identity).keyPair.secretKey;
  const secretKey = Uint8Array.from(base64.decodeUrl(secretKeyB64, 'binary'));
  return base64.encodeUrl(nacl.sign(data, secretKey), 'binary');
}

