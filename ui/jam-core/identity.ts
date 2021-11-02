import {keyPairFromSecretKey, keyPairFromSeed, newKeyPair} from 'watsign';
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

const identities = StoredState('identities') as {[x: string]: IdentityType};
let identityReady = (async () => {
  if (identities._default) return;
  let identity = importLegacyIdentity() || (await createIdentity());
  set(identities, '_default', identity);
  migrateDisplayName(identities);
})();

function Identity({swarm}) {
  const hasPosted = new Map<string, IdentityInfo>();

  // we don't want to block the first React render with signing our avatar image
  // maybe there's something cleaner than this heuristic
  Promise.all([onload, identityReady]).then(() => {
    setTimeout(() => {
      maybePostIdentity('_default', identities._default);
    }, 0);
  });

  function maybePostIdentity(roomId: string, identity: IdentityType) {
    let previous = hasPosted.get(roomId);
    if (previous && previous === identity.info) return;
    hasPosted.set(roomId, identity.info);
    if (!previous) {
      putOrPost(
        {myIdentity: identity},
        `/identities/${identity.publicKey}`,
        identity.info
      );
    }
    if (identity.publicKey === swarm.myPeerId) {
      sendPeerEvent(swarm, 'identity-update', identity.info);
    }
  }

  return function Identity({roomId}) {
    let defaultIdentity = use(identities, '_default');
    let roomIdentity = use(identities, roomId);

    if (roomIdentity !== undefined) {
      maybePostIdentity(roomId, roomIdentity);
    }

    let myIdentity = roomIdentity ?? defaultIdentity;
    return myIdentity;
  };
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

async function importDefaultIdentity(
  identity: Partial<IdentityType> & {seed?: string}
) {
  await importRoomIdentity('_default', identity);
}

async function importRoomIdentity(
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
    fullIdentity = await createIdentityFromSecretKey(
      identity.info,
      identity.secretKey
    );
  } else if (identity.seed) {
    fullIdentity = await createIdentityFromSeed(identity.info, identity.seed);
  } else if (existingIdentity) {
    fullIdentity = existingIdentity;
    fullIdentity.info = {
      ...existingIdentity.info,
      ...identity.info,
      id: existingIdentity.publicKey,
    };
  } else {
    fullIdentity = await createIdentity(identity.info);
  }

  set(identities, roomId, fullIdentity);
  let ok = await putOrPost(
    {myIdentity: fullIdentity},
    `/identities/${fullIdentity.publicKey}`,
    fullIdentity.info
  );
  if (!ok) {
    console.error('importing identity failed!');
  }
}

async function createIdentityFromSecretKey(
  info: IdentityInfo | undefined,
  privatekeyBase64: string
) {
  const keypair = await keyPairFromSecretKey(decode(privatekeyBase64));
  return createIdentityFromKeypair(info, keypair);
}

async function createIdentityFromSeed(
  info: IdentityInfo | undefined,
  seedString: string
) {
  const hash = new Uint8Array(
    await crypto.subtle.digest('SHA-512', new TextEncoder().encode(seedString))
  ).slice(0, 32);
  const keypair = await keyPairFromSeed(hash);
  return createIdentityFromKeypair(info, keypair);
}

async function createIdentity(info?: IdentityInfo) {
  const keypair = await newKeyPair();
  return createIdentityFromKeypair(info, keypair);
}

function createIdentityFromKeypair(
  info: IdentityInfo | undefined,
  keypair: {secretKey: Uint8Array; publicKey: Uint8Array}
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
