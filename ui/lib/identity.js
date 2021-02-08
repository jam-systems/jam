import nacl from 'tweetnacl';
import base64 from 'compact-base64';
import {adjectives, nouns} from "./names";
import {post, put} from "../backend";


function decode(base64String) {
  return Uint8Array.from(base64.decodeUrl(base64String, 'binary'));
}

function encode(binaryData) {
  return base64.encodeUrl(binaryData, 'binary');
}

const timeCodeFromBytes = (timeCodeBytes) => timeCodeBytes[0] +
    (timeCodeBytes[1] << 8) +
    (timeCodeBytes[2] << 16) +
    (timeCodeBytes[3] << 24);
const currentTimeCode = () => Math.round(Date.now() / 30000);


export function initializeIdentity() {
  if (!localStorage.identity) {
    const keypair = nacl.sign.keyPair();
    const identity = {
      keyPair: {
        publicKey: encode(keypair.publicKey),
        secretKey: encode(keypair.secretKey),
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
  const secretKey = decode(secretKeyB64);
  return encode(nacl.sign(data, secretKey));
}


export const verifyToken = (authToken, key) => {
  const timeCodeBytes = nacl.sign.open(
      decode(authToken),
      decode(key)
  );
  return timeCodeBytes && timeCodeFromBytes(timeCodeBytes) === currentTimeCode();
}


export function signedToken() {
  const dateToken = currentTimeCode();
  const signData = Uint8Array.of(
      dateToken % 256,
      (dateToken >> 8) % 256,
      (dateToken >> 16) % 256,
      (dateToken >> 24) % 256
  );
  return sign(signData);
}

