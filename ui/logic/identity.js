import nacl from 'tweetnacl';
import {set} from 'use-minimal-state';
import {StoredState} from '../lib/local-storage';
import {importLegacyIdentity} from '../lib/migrations';
import {encode, decode} from '../lib/identity-utils';
import {post, put} from './backend';

export {Identity, setCurrentIdentity, importRoomIdentity, initializeIdentity};

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

async function initializeIdentity(roomId) {
  const identity = roomId
    ? identities[roomId] || identities['_default']
    : identities['_default'];
  return (
    (await put(
      {myIdentity: identity},
      `/identities/${identity.publicKey}`,
      identity.info
    )) ||
    (await post(
      {myIdentity: identity},
      `/identities/${identity.publicKey}`,
      identity.info
    ))
  );
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

// TODO: this does not update the identity in state !!! (but everywhere else - server, localStorage)
function setCurrentIdentity({roomId}, valueOrFunction) {
  let identKey = identities[roomId] ? roomId : '_default';
  set(identities, identKey, valueOrFunction);
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
