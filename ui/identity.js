import nacl from 'tweetnacl';
import base64 from 'compact-base64';
import {adjectives, nouns} from './lib/names';
import {post, put} from './backend';

function decode(base64String) {
  return Uint8Array.from(base64.decodeUrl(base64String, 'binary'));
}

function encode(binaryData) {
  return base64.encodeUrl(binaryData, 'binary');
}

const timeCodeFromBytes = timeCodeBytes =>
  timeCodeBytes[0] +
  (timeCodeBytes[1] << 8) +
  (timeCodeBytes[2] << 16) +
  (timeCodeBytes[3] << 24);
const timeCodeToBytes = timeCode =>
  Uint8Array.of(
    timeCode % 256,
    (timeCode >> 8) % 256,
    (timeCode >> 16) % 256,
    (timeCode >> 24) % 256
  );
// TODO maybe better 10 sec instead of 30?
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
        displayName: `${
          adjectives[Math.floor(Math.random() * adjectives.length)]
        } ${nouns[Math.floor(Math.random() * nouns.length)]}`,
        email: null,
      },
    };
    localStorage.identity = JSON.stringify(identity);
    post(
      signedToken(),
      `/identities/${identity.keyPair.publicKey}`,
      identity.info
    );
  }
}

export function getId() {
  return JSON.parse(localStorage.identity).keyPair.publicKey;
}

export function getInfo() {
  const info = JSON.parse(localStorage.identity).info;
  return {
    ...info,
    id: getId(),
  };
}

export async function updateInfo(info) {
  const identity = JSON.parse(localStorage.identity);
  identity.info = info;
  identity.info.id = undefined;
  localStorage.identity = JSON.stringify(identity);
  if (
    !(await put(
      signedToken(),
      `/identities/${identity.keyPair.publicKey}`,
      identity.info
    ))
  ) {
    post(
      signedToken(),
      `/identities/${identity.keyPair.publicKey}`,
      identity.info
    );
  }
}

export function sign(data) {
  const secretKeyB64 = JSON.parse(localStorage.identity).keyPair.secretKey;
  const secretKey = decode(secretKeyB64);
  return encode(nacl.sign(data, secretKey));
}

export const verifyToken = (authToken, key) => {
  const timeCodeBytes = nacl.sign.open(decode(authToken), decode(key));
  return (
    timeCodeBytes && timeCodeFromBytes(timeCodeBytes) === currentTimeCode()
  );
};

export function signedToken() {
  const signData = timeCodeToBytes(currentTimeCode());
  return sign(signData);
}

// sign data + current time to prevent replay of outdated message
export function signData(data) {
  let dataBytes = new TextEncoder().encode(JSON.stringify(data));
  let timeBytes = timeCodeToBytes(currentTimeCode());
  return sign(concat(timeBytes, dataBytes));
}
export function verifyData(signed, key) {
  try {
    let bytes = nacl.sign.open(decode(signed), decode(key));
    let timeCode = timeCodeFromBytes(bytes.subarray(0, 4));
    if (timeCode !== currentTimeCode()) return;
    let dataBytes = bytes.subarray(4);
    return JSON.parse(new TextDecoder().decode(dataBytes));
  } catch (err) {
    console.warn(err);
  }
}

// util for uint8array
function concat(arr1, arr2) {
  let arr = new Uint8Array(arr1.length + arr2.length);
  arr.set(arr1);
  arr.set(arr2, arr1.length);
  return arr;
}
