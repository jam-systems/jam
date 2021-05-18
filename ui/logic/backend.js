import {useCallback, useEffect, useState} from 'react';
import {on, set, use} from 'use-minimal-state';
import state, {modState, swarm} from './state';
import {staticConfig} from './config';
import {signedToken, signData, currentId, identities} from './identity';
import {emptyRoom} from './room';
// POST https://jam.systems/_/pantry/api/v1/rooms/:roomId {"moderators": [moderatorId], "speakers":[speakerid]}
// Creates room, returns 409 conflict if room exists

// GET https://jam.systems/_/pantry/api/v1/rooms/:roomId
// returns {"moderators": [moderatorId], "speakers":[speakerid]}

// PUT https://jam.systems/_/pantry/api/v1/rooms/:roomId {"moderators": [moderatorId], "speakers":[speakerid]}
// updates room and broadcasts to roomId / channel room-info on signal hub

let API = `${staticConfig.urls.pantry}/api/v1`;
on(staticConfig, () => {
  API = `${staticConfig.urls.pantry}/api/v1`;
});

const queries = {};

export function useApiQuery(path, {dontFetch = false, fetchOnMount = false}) {
  let cached = use(queries, path);
  let shouldFetch = path && !dontFetch && !cached;
  let [isLoading, setLoading] = useState(shouldFetch);
  let [hasFetched, setHasFetched] = useState(false);

  let refetch = useCallback(async () => {
    let res = await fetch(API + path, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Token ${signedToken()}`,
      },
    }).catch(console.warn);
    if (!res) {
      setLoading(false);
      return;
    }

    let data;
    if (res.status < 400) data = await res.json().catch(console.warn);
    updateApiQuery(path, data, res.status);
    setLoading(false);
  }, [path]);

  useEffect(() => {
    if (shouldFetch || (fetchOnMount && !hasFetched)) {
      refetch().then(() => setHasFetched(true));
    } else setLoading(false);
  }, [shouldFetch, refetch, hasFetched, fetchOnMount]);

  let {data, status} = cached || {};
  return [data, isLoading, status, refetch];
}

export function updateApiQuery(path, data, status = 200) {
  set(queries, path, data && {data, status});
}

export function forwardApiQuery(state, path, key, defaultQuery) {
  set(state, key, queries[path]?.data || defaultQuery);
  return on(queries, path, (query, oldQuery) => {
    let data = query?.data || defaultQuery;
    let oldData = oldQuery?.data || defaultQuery;
    if (data !== oldData) set(state, key, data);
  });
}

async function authenticatedApiRequest(method, path, payload) {
  let res = await fetch(API + path, {
    method: method.toUpperCase(),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: payload ? JSON.stringify(signData(payload)) : undefined,
  });
  return res.ok;
}

// returns [data, ok, status]
export async function get(path) {
  let res = await fetch(API + path, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
  if (res.status < 400) return [await res.json(), true, res.status];
  else return [undefined, false, res.status];
}

// returns [data, ok, status]
export async function authedGet(path) {
  let res = await fetch(API + path, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Token ${signedToken()}`,
    },
  });
  if (res.status < 400) return [await res.json(), true, res.status];
  else return [undefined, false, res.status];
}

export async function post(path, payload) {
  return authenticatedApiRequest('POST', path, payload);
}

export async function put(path, payload) {
  return authenticatedApiRequest('PUT', path, payload);
}

export async function deleteRequest(path, payload = null) {
  return authenticatedApiRequest('DELETE', path, payload);
}

export async function createRoom(
  roomId,
  peerId,
  {name = '', description = '', logoURI, color, stageOnly} = {}
) {
  let room = {
    ...emptyRoom,
    name,
    description,
    logoURI,
    color,
    stageOnly: !!stageOnly,
    moderators: [peerId],
    speakers: [peerId],
  };
  let ok = await post(`/rooms/${roomId}`, room);
  if (ok) return room;
}

export function useCreateRoom({
  roomId,
  room,
  isLoading: isRoomLoading,
  newRoom,
  onSuccess,
}) {
  let [isError, setError] = useState(false);
  let [isLoading, setLoading] = useState(true);
  useEffect(() => {
    if (roomId && !room && !isRoomLoading) {
      (async () => {
        let roomCreated = await createRoom(roomId, currentId(), newRoom);
        console.log(roomCreated);
        setLoading(false);
        if (roomCreated) {
          updateApiQuery(`/rooms/${roomId}`, roomCreated);
          onSuccess?.();
        } else {
          setError(true);
        }
      })();
    }
  }, [room, roomId, isRoomLoading]);
  return [isLoading, isError];
}

// identity

export async function initializeIdentity(roomId) {
  const identity = roomId
    ? identities[roomId] || identities['_default']
    : identities['_default'];
  return (
    (await put(`/identities/${identity.publicKey}`, identity.info)) ||
    (await post(`/identities/${identity.publicKey}`, identity.info))
  );
}

export async function updateInfoServer(info) {
  return (
    (await put(`/identities/${currentId()}`, info)) ||
    (await post(`/identities/${currentId()}`, info))
  );
}

// mod message / mod state

// post initial status on entering room
on(state, 'inRoom', () => {
  sendModMessage(modState);
});
// post on changes
on(modState, () => {
  sendModMessage(modState);
});
async function sendModMessage(msg) {
  let {inRoom} = state;
  if (inRoom) {
    await post(`/rooms/${inRoom}/modMessage/${currentId()}`, msg);
  }
}
// fetch mod messages when we become moderator
on(state, 'iAmModerator', async iAmModerator => {
  let {roomId} = state;
  if (iAmModerator && roomId) {
    let [msgs, ok] = await authedGet(`/rooms/${roomId}/modMessage`);
    if (ok) set(state, 'modMessages', msgs);
  } else {
    set(state, 'modMessages', {}); // delete when we stop being moderator
  }
});
// listen for mod message pings and fetch if we are moderator
on(swarm.serverEvent, 'mod-message', async () => {
  let {iAmModerator, roomId} = state;
  if (iAmModerator && roomId) {
    let [msgs, ok] = await authedGet(`/rooms/${roomId}/modMessage`);
    if (ok) set(state, 'modMessages', msgs);
  }
});
