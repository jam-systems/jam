import nacl from 'tweetnacl';
import {set} from 'minimal-state';
import {StoredState} from '../lib/local-storage';
import {importLegacyIdentity, migrateDisplayName} from '../lib/migrations';
import {encode, decode} from '../lib/identity-utils';
import {domEvent} from '../lib/util';
import {putOrPost} from './backend';
import {use} from '../lib/state-tree';
import {sendPeerEvent} from '../lib/swarm';
import {IdentityInfo, IdentityType} from './state';

export {Identity, importDefaultIdentity, importRoomIdentity, updateInfo};

let onload = domEvent(window, 'load');

const identities = StoredState('identities', () => {
  const _default = importLegacyIdentity() || createIdentity();
  return {_default};
}) as {_default: IdentityType; [x: string]: IdentityType};
migrateDisplayName(identities);

function Identity() {
  // we don't want to block the first React render with signing our avatar image
  // maybe there's something cleaner than this heuristic
  onload.then(() => {
    setTimeout(() => {
      postInitialIdentity(identities._default);
    }, 0);
  });
  const hasPosted = new Set();

  return function Identity({roomId}) {
    let defaultIdentity = use(identities, '_default');
    let roomIdentity = use(identities, roomId);

    if (roomIdentity !== undefined && !hasPosted.has(roomId)) {
      hasPosted.add(roomId);
      postInitialIdentity(roomIdentity);
    }

    let myIdentity = roomIdentity ?? defaultIdentity;
    return myIdentity;
  };
}

function postInitialIdentity(identity) {
  return putOrPost(
    {myIdentity: identity},
    `/identities/${identity.publicKey}`,
    identity.info
  );
}

async function updateInfo(state: any, info: IdentityInfo) {
  let {myIdentity, myId, swarm} = state;
  info = {...myIdentity.info, ...info};
  let ok = (await putOrPost(state, `/identities/${myId}`, info)) as boolean;
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

function importDefaultIdentity(
  identity: Partial<IdentityType> & {seed?: string}
) {
  importRoomIdentity('_default', identity);
}

function importRoomIdentity(
  roomId: string,
  identity: Partial<IdentityType> & {seed?: string}
) {
  let fullIdentity: IdentityType;
  let existingIdentity = identities[roomId];
  if (identity.secretKey && identity.publicKey) {
    fullIdentity = {
      publicKey: identity.publicKey,
      secretKey: identity.secretKey,
      info: {...identity.info, id: identity.publicKey},
    };
  } else if (identity.secretKey) {
    fullIdentity = createIdentityFromSecretKey(
      identity.info,
      identity.secretKey
    );
  } else if (identity.seed) {
    fullIdentity = createIdentityFromSeed(identity.info, identity.seed);
  } else if (existingIdentity) {
    fullIdentity = existingIdentity;
    fullIdentity.info = {
      ...existingIdentity.info,
      ...identity.info,
      id: existingIdentity.publicKey,
    };
  } else {
    fullIdentity = createIdentity(identity.info);
  }
  set(identities, roomId, fullIdentity);
}

function createIdentityFromSecretKey(
  info: IdentityInfo | undefined,
  privatekeyBase64: string
) {
  const keypair = nacl.sign.keyPair.fromSecretKey(decode(privatekeyBase64));
  return createIdentityFromKeypair(info, keypair);
}

function createIdentityFromSeed(
  info: IdentityInfo | undefined,
  seedString: string
) {
  const keypair = nacl.sign.keyPair.fromSeed(
    nacl.hash(new TextEncoder().encode(seedString)).subarray(0, 32)
  );
  return createIdentityFromKeypair(info, keypair);
}

function createIdentity(info?: IdentityInfo) {
  const keypair = nacl.sign.keyPair();
  return createIdentityFromKeypair(info, keypair);
}

function createIdentityFromKeypair(
  info: IdentityInfo | undefined,
  keypair: nacl.SignKeyPair
) {
  let publicKey = encode(keypair.publicKey) as string;
  let secretKey = encode(keypair.secretKey) as string;
  return {
    publicKey,
    secretKey,
    info: {
      ...info,
      id: publicKey,
    },
  };
}
