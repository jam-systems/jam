import nacl from 'tweetnacl';
import base64 from 'compact-base64';
import ssr from 'simple-signed-records-engine';
import state from './state';
import {set, use} from 'use-minimal-state';
import {StoredState} from '../lib/local-storage';
import {importLegacyIdentity} from '../lib/migrations';
import {Buffer} from 'buffer';

const MESSAGE_VALIDITY_SECONDS = 20;

window.Buffer = Buffer; // ugh

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

export const identities = StoredState('identities', () => {
  const _default = localStorage['identity']
    ? importLegacyIdentity()
    : createIdentity();
  return {
    _default,
  };
});

export const useCurrentIdentity = () => {
  const roomId = state.roomId;
  if (identities[roomId]) {
    return use(identities, roomId);
  } else {
    return use(identities, '_default');
  }
};

export const currentIdentity = () => {
  const roomId = state.roomId;
  if (identities[roomId]) {
    return identities[roomId];
  } else {
    return identities['_default'];
  }
};

export const currentId = () => {
  const roomId = state.roomId;
  if (identities[roomId]) {
    return identities[roomId].publicKey;
  } else {
    return identities['_default'].publicKey;
  }
};

export const importRoomIdentity = (roomId, roomIdentity, keys) => {
  if (roomIdentity) {
    if (keys[roomIdentity.id]) {
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
};

export const addIdentity = (key, identity) => {
  set(identities, key, identity);
};

function keypair(identity) {
  return {
    secretKey: decode(identity.secretKey),
    publicKey: decode(identity.publicKey),
  };
}

export const signData = data => {
  return ssr.sign({
    record: data,
    keypair: keypair(currentIdentity()),
    validSeconds: MESSAGE_VALIDITY_SECONDS,
  });
};

export const verifyToken = authToken => {
  return ssr.verify(decode(authToken));
};

export function signedToken() {
  return base64.encodeUrl(JSON.stringify(signData({})));
}

export function verifyData(record) {
  return ssr.data(record);
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

export function publicKeyToIndex(publicKey, range) {
  const bytes = decode(publicKey);
  return Math.abs(integerFromBytes(bytes)) % range;
}
