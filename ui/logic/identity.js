import nacl from 'tweetnacl';
import state from './state';
import {set, use} from 'use-minimal-state';
import {StoredState} from '../lib/local-storage';
import {importLegacyIdentity} from '../lib/migrations';
import {encode, decode} from '../lib/identity-utils';
import {post, put} from './backend';

export {
  Identity,
  identities,
  currentId,
  setCurrentIdentity,
  useCurrentIdentity,
  importRoomIdentity,
  initializeIdentity,
};

const identities = StoredState('identities', () => {
  const _default = importLegacyIdentity() || createIdentity();
  return {_default};
});

function Identity() {
  return function Identity({roomId}) {
    let myIdentity = identities[roomId] || identities['_default'];
    let myId = myIdentity.publicKey;
    return {myId, myIdentity};
  };
}

async function initializeIdentity(state, roomId) {
  const identity = roomId
    ? identities[roomId] || identities['_default']
    : identities['_default'];
  return (
    (await put(state, `/identities/${identity.publicKey}`, identity.info)) ||
    (await post(state, `/identities/${identity.publicKey}`, identity.info))
  );
}

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

function setCurrentIdentity({roomId}, valueOrFunction) {
  let identKey = identities[roomId] ? roomId : '_default';
  set(identities, identKey, valueOrFunction);
}

function useCurrentIdentity(roomId) {
  let roomIdentity = use(identities, roomId);
  let defaultIdentity = use(identities, '_default');
  return roomIdentity || defaultIdentity;
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
