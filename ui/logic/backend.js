import {useEffect, useState} from 'react';
import {on} from 'use-minimal-state';
import {use} from '../lib/state-tree';
import {staticConfig} from './config';
import {signedToken, signData, currentId, identities} from './identity';
import {emptyRoom} from './room';
import GetRequest, {populateCache} from './GetRequest';

let API = `${staticConfig.urls.pantry}/api/v1`;
on(staticConfig, () => {
  API = `${staticConfig.urls.pantry}/api/v1`;
});

export function useApiQuery(path, {dontFetch = false, fetchOnMount = false}) {
  let {data, isLoading, status} = use(GetRequest, {
    path,
    dontFetch,
    fetchOnMount,
  });
  return [data, isLoading, status];
}

export function updateApiQuery(path, data) {
  populateCache(path, data);
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
