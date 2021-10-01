import base64 from 'compact-base64';
// import ssr from 'simple-signed-records-engine';
import * as wsj from './watsign-json.js';

export {signedToken, verifyToken, signData, verifyData, decode, encode};

// identity === {publicKey, secretKey} where both keys are base64Url strings

const MESSAGE_VALIDITY_SECONDS = 300;

async function signData(identity, data) {
  return wsj.signData({
    record: data,
    keypair: keypair(identity),
    validSeconds: MESSAGE_VALIDITY_SECONDS,
  });
}

async function verifyData(record, key) {
  let verifiedRecord = await wsj.getVerifiedData(record);
  if (!verifiedRecord) return;
  let {identities, data} = verifiedRecord;
  if (!identities.includes(base64.urlToOriginal(key))) return;
  return data;
}

async function signedToken(identity) {
  return base64.encodeUrl(JSON.stringify(await signData(identity, {})));
}

async function verifyToken(authToken) {
  return wsj.verifyData(decode(authToken));
}

function keypair(identity) {
  return {
    secretKey: decode(identity.secretKey),
    publicKey: decode(identity.publicKey),
  };
}

function decode(base64String) {
  return Uint8Array.from(base64.decodeUrl(base64String, 'binary'));
}

function encode(binaryData) {
  return base64.encodeUrl(binaryData, 'binary');
}
