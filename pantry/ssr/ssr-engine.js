/* Simple Signed Records Engine*/
const nacl = require('tweetnacl');
const base64 = require('compact-base64');
// const naclUtil = require('tweetnacl-util');

const createBytesToSign = ({Version, Expiration, KeyType, Certified}) => {
  const versionBytes = Buffer.from([0, 0, 0, 0]);
  const expirationBytes = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
  const keyTypeBytes = Buffer.from(KeyType);
  // const payloadBytes = Buffer.from(naclUtil.decodeBase64(Certified));
  const payloadBytes = Buffer.from(base64.decode(Certified, 'binary'));

  // Convert the version into a little-endian uint32 representation
  for (let i = 0; i < 4; i++) {
    versionBytes[i] = (Version >> (8 * i)) & 0xff;
  }
  // Convert the timestamp into a little-endian uint64 representation
  for (let i = 0; i < 8; i++) {
    expirationBytes[i] = (Expiration >> (8 * i)) & 0xff;
  }

  // Pack header bytes and payload
  const headers = Buffer.concat([versionBytes, expirationBytes, keyTypeBytes]);
  return new Uint8Array(Buffer.concat([headers, payloadBytes]));
};

const verify = ssr => {
  try {
    const bytesToSign = createBytesToSign(ssr);

    if (ssr.Version !== 0) {
      return false;
    }

    return ssr.Signatures.map(signature =>
      nacl.sign.detached.verify(
        bytesToSign,
        new Uint8Array(base64.decode(signature.Payload, 'binary')),
        new Uint8Array(base64.decode(signature.Identity, 'binary'))
      )
    ).every(s => s);
  } catch (e) {
    return false;
  }
};

const data = ssr => {
  if (verify(ssr)) {
    const dataRaw = new Uint8Array(base64.decode(ssr.Certified, 'binary'));

    return {
      data: JSON.parse(Buffer.from(dataRaw).toString('utf-8')),
      identities: ssr.Signatures.map(s => s.Identity),
    };
  }
  return undefined;
};

module.exports = {data};
