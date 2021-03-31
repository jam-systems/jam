import nacl from 'tweetnacl';
import base64 from 'compact-base64';
import {adjectives, nouns} from '../lib/names';
import {StoredState} from '../lib/local-storage';
import {DEV} from './config';
import {set, update} from 'use-minimal-state';
import {debug} from './util';

const identity = StoredState('identity', () => {
  const keypair = nacl.sign.keyPair();
  let publicKey = encode(keypair.publicKey);
  let secretKey = encode(keypair.secretKey);
  return {
    publicKey,
    secretKey,
    info: {
      id: publicKey,
    },
  };
});

if (DEV) debug(identity);

// MIGRATIONS
if (!identity.publicKey && identity.keyPair.publicKey) {
  set(identity, 'publicKey', identity.keyPair.publicKey);
  set(identity, 'secretKey', identity.keyPair.secretKey);
}
// nuked identity.info
if (!identity.info) {
  set(identity, 'info', {id: identity.publicKey});
}

// missing .id
if (!identity.info.id) {
  identity.info.id = identity.publicKey;
  update(identity, 'info');
}

// REMOVE WHEN ALL old twitter identities converted
if (identity.info.twitter) {
  let twitterIdentity = {
    type: 'twitter',
    id: identity.info.twitter,
    verificationInfo: identity.info.tweet,
  };
  if (
    !identity.info.identities ||
    !identity.info.identities.length ||
    !identity.info.identities[0].id
  ) {
    set(identity, 'info', {
      ...identity.info,
      identities: [twitterIdentity],
    });
  }
  set(identity, 'info', {
    ...identity.info,
    twitter: undefined,
    tweet: undefined,
  });
}

export default identity;

export function sign(data) {
  const secretKeyB64 = identity.secretKey;
  const secretKey = decode(secretKeyB64);
  return encode(nacl.sign(data, secretKey));
}

export const verifyToken = (authToken, key) => {
  const timeCodeBytes = nacl.sign.open(decode(authToken), decode(key));
  return timeCodeBytes && timeCodeValid(timeCodeFromBytes(timeCodeBytes));
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
    if (!timeCodeValid(timeCode)) return;
    let dataBytes = bytes.subarray(4);
    return JSON.parse(new TextDecoder().decode(dataBytes));
  } catch (err) {
    console.warn(err);
  }
}

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

const currentTimeCode = () => Math.round(Date.now() / 30000);
const timeCodeValid = code => Math.abs(code - currentTimeCode()) <= 10;


// util for uint8array
function concat(arr1, arr2) {
  let arr = new Uint8Array(arr1.length + arr2.length);
  arr.set(arr1);
  arr.set(arr2, arr1.length);
  return arr;
}


export function publicKeyToIndex(publicKey, range) {
  const bytes = decode(publicKey);
  return timeCodeFromBytes(bytes) % range;
}
