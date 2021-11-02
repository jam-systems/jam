import {toBytes, toBase64} from 'fast-base64/js';
import {toUrl, fromUrl} from 'fast-base64/url';
import * as wsr from './watsign-records.js';

export {signedToken, verifyToken, signData, verifyData, decode, encode};

// identity === {publicKey, secretKey} where both keys are base64Url strings

const MESSAGE_VALIDITY_SECONDS = 300;

async function signData(identity, data) {
  return wsr.signData({
    record: data,
    keypair: keypair(identity),
    validSeconds: MESSAGE_VALIDITY_SECONDS,
  });
}

async function verifyData(record, key) {
  let verifiedRecord = await wsr.getVerifiedData(record);
  if (!verifiedRecord) return;
  let {identities, data} = verifiedRecord;
  if (!identities.includes(fromUrl(key))) return;
  return data;
}

async function signedToken(identity) {
  let signed = await signData(identity, {});
  return encode(new TextEncoder().encode(JSON.stringify(signed)));
}

async function verifyToken(authToken) {
  return wsr.verifyData(decode(authToken));
}

function keypair(identity) {
  return {
    secretKey: decode(identity.secretKey),
    publicKey: decode(identity.publicKey),
  };
}

function decode(base64String) {
  return toBytes(fromUrl(base64String));
}

function encode(binaryData) {
  return toUrl(toBase64(binaryData));
}
