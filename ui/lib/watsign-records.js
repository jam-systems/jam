import {sign, verify} from 'watsign';
import {toBytes, toBase64} from 'fast-base64';
import {concatBytes} from './util.js';

export {signData, verifyData, getVerifiedData};

async function signData({record, keypair, validSeconds, validUntil}) {
  let Certified = await toBase64(
    new TextEncoder().encode(JSON.stringify(record))
  );
  let Expiration =
    validUntil || (validSeconds || 1800) + Math.floor(Date.now() / 1000.0);
  let bytesToSign = await createBytesToSign({
    Version: 0,
    Expiration,
    KeyType: 'ed25519',
    Certified,
  });

  return {
    Version: 0,
    Expiration,
    KeyType: 'ed25519',
    Certified,
    Signatures: [await createSignature(bytesToSign, keypair)],
  };
}

// TODO: improve protocol
// async function verifyData({expiration, certified, signature}, key) {
//   let ok = false;
//   if (signature.key !== fromUrl(key)) return;
//   try {
//     const bytesToSign = await createBytesToSign({expiration, certified});
//     let signatureBytes = await toBytes(signature.payload);
//     let publicKey = await toBytes(signature.key);
//     ok = await verify(bytesToSign, signatureBytes, publicKey);
//   } catch (e) {
//     console.log('error verifying', e);
//     return;
//   }
//   if (!ok) return;
//   return JSON.parse(certified);
// }
async function verifyData(signedRecord) {
  try {
    let bytesToSign = createBytesToSign(signedRecord);
    if (signedRecord.Version !== 0) {
      return false;
    }
    return await Promise.all(
      signedRecord.Signatures.map(async signature => {
        return verify(
          bytesToSign,
          await toBytes(signature.Payload),
          await toBytes(signature.Identity)
        );
      })
    ).every(s => s);
  } catch (e) {
    return false;
  }
}

async function getVerifiedData(signedRecord) {
  if (await verifyData(signedRecord)) {
    let dataRaw = await toBytes(signedRecord.Certified);
    let data = JSON.parse(new TextDecoder().decode(dataRaw));
    return {
      data,
      identities: signedRecord.Signatures.map(s => s.Identity),
    };
  }
  return undefined;
}

async function createSignature(bytesToSign, {publicKey, secretKey}) {
  let signatureBytes = await sign(bytesToSign, secretKey);
  let signature = await toBase64(signatureBytes);
  return {
    Identity: await toBase64(publicKey),
    Payload: signature,
  };
}

async function createBytesToSign({Version, Expiration, KeyType, Certified}) {
  let versionBytes = new Uint8Array(4);
  let expirationBytes = new Uint8Array(8);
  let keyTypeBytes = new TextEncoder().encode(KeyType);
  let payloadBytes = await toBytes(Certified);
  // let payloadBytes = new TextEncoder().encode(certified);

  // Convert the version into a little-endian uint32 representation
  for (let i = 0; i < 4; i++) {
    versionBytes[i] = (Version >> (8 * i)) & 0xff;
  }
  // TODO: this is incorrect, n >> 32 is just n >> 0 = n (the shift amount is taken mod 32)
  // Convert the timestamp into a little-endian uint64 representation
  for (let i = 0; i < 8; i++) {
    expirationBytes[i] = (Expiration >> (8 * i)) & 0xff;
  }
  return concatBytes(versionBytes, expirationBytes, keyTypeBytes, payloadBytes);
}
