import nacl from 'tweetnacl';
import {set} from 'use-minimal-state';
import {StoredState} from '../lib/local-storage';
import {importLegacyIdentity, migrateDisplayName} from '../lib/migrations';
import {encode, decode} from '../lib/identity-utils';
import {putOrPost} from './backend';
import {use} from '../lib/state-tree';
import {sendPeerEvent} from '../lib/swarm';
import {swarm} from './state';

export {Identity, importRoomIdentity, updateInfo};

const identities = StoredState('identities', () => {
  const _default = importLegacyIdentity() || createIdentity();
  return {_default};
});
migrateDisplayName(identities);

function Identity() {
  postInitialIdentity(identities._default);
  const hasPosted = new Set();

  return function Identity({roomId}) {
    let defaultIdentity = use(identities, '_default');
    let roomIdentity = use(identities, roomId);

    if (roomIdentity !== undefined && !hasPosted.has(roomId)) {
      hasPosted.add(roomId);
      postInitialIdentity(roomIdentity);
    }

    let myIdentity = roomIdentity ?? defaultIdentity;
    let myId = myIdentity.publicKey;
    return {myId, myIdentity};
  };
}

function postInitialIdentity(identity) {
  return putOrPost(
    {myIdentity: identity},
    `/identities/${identity.publicKey}`,
    identity.info
  );
}

async function updateInfo(state, info) {
  let {myIdentity, myId} = state;
  info = {...myIdentity.info, ...info};
  console.warn('posting', info);
  let ok = await putOrPost(state, `/identities/${myId}`, info);
  if (ok) {
    setCurrentIdentity(state, i => ({...i, info}));
    sendPeerEvent(swarm, 'identity-update', info);
  }
  return ok;
}

function setCurrentIdentity({roomId}, valueOrFunction) {
  let identityKey = identities[roomId] ? roomId : '_default';
  set(identities, identityKey, valueOrFunction);
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

function createIdentityFromSecretKey(info, privatekeyBase64) {
  const keypair = nacl.sign.keyPair.fromSecretKey(decode(privatekeyBase64));
  return createIdentityFromKeypair(info, keypair);
}

function createIdentityFromSeed(info, seedString) {
  const keypair = nacl.sign.keyPair.fromSeed(
    nacl.hash(new TextEncoder().encode(seedString))
  );
  return createIdentityFromKeypair(info, keypair);
}

function createIdentity(info) {
  const keypair = nacl.sign.keyPair();
  return createIdentityFromKeypair(info, keypair);
}

function createIdentityFromKeypair(info, keypair) {
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
}

function addIdentity(key, identity) {
  set(identities, key, identity);
}
