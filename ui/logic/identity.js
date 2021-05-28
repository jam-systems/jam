import nacl from 'tweetnacl';
import base64 from 'compact-base64';
import ssr from 'simple-signed-records-engine';
import state from './state';
import {set, use} from 'use-minimal-state';
import {StoredState} from '../lib/local-storage';
import {importLegacyIdentity} from '../lib/migrations';

export {
  identities,
  currentId,
  signedToken,
  signData,
  verifyData,
  currentIdentity,
  setCurrentIdentity,
  useCurrentIdentity,
  importRoomIdentity,
  publicKeyToIndex,
};

const MESSAGE_VALIDITY_SECONDS = 300;

const createIdentityFromSecretKey = (info, privatekeyBase64) => {
  const keypair = nacl.sign.keyPair.fromSecretKey(decode(privatekeyBase64));
  return createIdentityFromKeypair(info, keypair);
};

const createIdentityFromSeed = (info, seedString) => {
  const keypair = nacl.sign.keyPair.fromSeed(
    nacl.hash(new TextEncoder().encode(seedString))
  );
  return createIdentityFromKeypair(info, keypair);
};

const createIdentity = info => {
  const keypair = nacl.sign.keyPair();
  return createIdentityFromKeypair(info, keypair);
};

const createIdentityFromKeypair = (info, keypair) => {
  let publicKey = encode(keypair.publicKey);
  let secretKey = encode(keypair.secretKey);
  return {
    publicKey,
    secretKey,
    info: {
      ...info,
      id: publicKey,
    },
  };
};

const identities = StoredState('identities', () => {
  const _default = importLegacyIdentity() || createIdentity();
  return {_default};
});

function setCurrentIdentity({roomId}, valueOrFunction) {
  let identKey = identities[roomId] ? roomId : '_default';
  set(identities, identKey, valueOrFunction);
}

function useCurrentIdentity(roomId) {
  let roomIdentity = use(identities, roomId);
  let defaultIdentity = use(identities, '_default');
  return roomIdentity || defaultIdentity;
}

function currentIdentity({roomId}) {
  return identities[roomId] || identities['_default'];
}

function currentId() {
  let {roomId} = state;
  if (identities[roomId]) {
    return identities[roomId].publicKey;
  } else {
    return identities['_default'].publicKey;
  }
}

function importRoomIdentity(roomId, roomIdentity, keys) {
  if (identities[roomId]) return;
  if (roomIdentity) {
    if (keys && keys[roomIdentity.id]) {
      if (keys[roomIdentity.id].seed) {
        addIdentity(
          roomId,
          createIdentityFromSeed(roomIdentity, keys[roomIdentity.id].seed)
        );
      } else {
        addIdentity(
          roomId,
          createIdentityFromSeed(roomIdentity, keys[roomIdentity.id].secretKey)
        );
      }
    } else {
      addIdentity(roomId, createIdentity(roomIdentity));
    }
  }
}

function addIdentity(key, identity) {
  set(identities, key, identity);
}

function keypair(identity) {
  return {
    secretKey: decode(identity.secretKey),
    publicKey: decode(identity.publicKey),
  };
}

function signData(state, data) {
  return ssr.sign({
    record: data,
    keypair: keypair(currentIdentity(state)),
    validSeconds: MESSAGE_VALIDITY_SECONDS,
  });
}

function verifyToken(authToken) {
  return ssr.verify(decode(authToken));
}

function signedToken(state) {
  return base64.encodeUrl(JSON.stringify(signData(state, {})));
}

function verifyData(record, key) {
  let verifiedRecord = ssr.data(record);
  if (!verifiedRecord) return;
  let {identities, data} = verifiedRecord;
  if (!identities.includes(base64.urlToOriginal(key))) return;
  return data;
}

function decode(base64String) {
  return Uint8Array.from(base64.decodeUrl(base64String, 'binary'));
}

function encode(binaryData) {
  return base64.encodeUrl(binaryData, 'binary');
}

const integerFromBytes = timeCodeBytes =>
  timeCodeBytes[0] +
  (timeCodeBytes[1] << 8) +
  (timeCodeBytes[2] << 16) +
  (timeCodeBytes[3] << 24);

const currentTimeCode = () => Math.round(Date.now() / 30000);
const timeCodeValid = code => Math.abs(code - currentTimeCode()) <= 10;

function publicKeyToIndex(publicKey, range) {
  const bytes = decode(publicKey);
  return Math.abs(integerFromBytes(bytes)) % range;
}
