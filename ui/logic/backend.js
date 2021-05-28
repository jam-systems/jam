import {useCallback, useEffect, useState} from 'react';
import {on} from 'use-minimal-state';
import {use} from '../lib/state-tree';
import {staticConfig} from './config';
import {identities} from './identity';
import {emptyRoom} from './room';
import GetRequest, {populateCache} from './GetRequest';
import {useStateObject} from '../views/StateContext';
import {signData, signedToken} from '../lib/identity-utils';

let API = `${staticConfig.urls.pantry}/api/v1`;
on(staticConfig, () => {
  API = `${staticConfig.urls.pantry}/api/v1`;
});

export function useApiQuery(path, {dontFetch = false, fetchOnMount = false}) {
  const state = useStateObject();
  const getToken = useCallback(() => signedToken(state.myIdentity), []);
  let {data, isLoading, status} = use(GetRequest, {
    path,
    dontFetch,
    fetchOnMount,
    getToken,
  });
  return [data, isLoading, status];
}

export function updateApiQuery(path, data) {
  populateCache(path, data);
}

async function authenticatedApiRequest({myIdentity}, method, path, payload) {
  let res = await fetch(API + path, {
    method: method.toUpperCase(),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: payload ? JSON.stringify(signData(myIdentity, payload)) : undefined,
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
async function authedGet({myIdentity}, path) {
  let res = await fetch(API + path, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Token ${signedToken(myIdentity)}`,
    },
  });
  if (res.status < 400) return [await res.json(), true, res.status];
  else return [undefined, false, res.status];
}

export async function post(state, path, payload) {
  return authenticatedApiRequest(state, 'POST', path, payload);
}

export async function put(state, path, payload) {
  return authenticatedApiRequest(state, 'PUT', path, payload);
}

export async function deleteRequest(state, path, payload = null) {
  return authenticatedApiRequest(state, 'DELETE', path, payload);
}

export async function createRoom(
  state,
  roomId,
  {name = '', description = '', logoURI, color, stageOnly} = {}
) {
  let {myId} = state;
  let room = {
    ...emptyRoom,
    name,
    description,
    logoURI,
    color,
    stageOnly: !!stageOnly,
    moderators: [myId],
    speakers: [myId],
  };
  let ok = await post(state, `/rooms/${roomId}`, room);
  if (ok) return room;
}

export function useCreateRoom({
  roomId,
  room,
  isLoading: isRoomLoading,
  newRoom,
  onSuccess,
}) {
  const state = useStateObject();
  let [isError, setError] = useState(false);
  let [isLoading, setLoading] = useState(true);
  useEffect(() => {
    if (roomId && !room && !isRoomLoading) {
      (async () => {
        let roomCreated = await createRoom(state, roomId, newRoom);
        setLoading(false);
        if (roomCreated) {
          populateCache(`/rooms/${roomId}`, roomCreated);
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

export async function initializeIdentity(state, roomId) {
  const identity = roomId
    ? identities[roomId] || identities['_default']
    : identities['_default'];
  return (
    (await put(state, `/identities/${identity.publicKey}`, identity.info)) ||
    (await post(state, `/identities/${identity.publicKey}`, identity.info))
  );
}

export async function updateInfoServer(state, info) {
  let {myId} = state;
  return (
    (await put(state, `/identities/${myId}`, info)) ||
    (await post(state, `/identities/${myId}`, info))
  );
}
