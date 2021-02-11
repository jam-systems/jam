import {useCallback, useEffect, useState} from 'react';
import use from './lib/use-state';
import state from './state.js';

// POST https://pantry.jam.systems/api/v1/rooms/:roomId {"moderators": [moderatorId], "speakers":[speakerid]}
// Creates room, returns 409 conflict if room exists

// GET https://pantry.jam.systems/api/v1/rooms/:roomId
// returns {"moderators": [moderatorId], "speakers":[speakerid]}

// PUT https://pantry.jam.systems/api/v1/rooms/:roomId {"moderators": [moderatorId], "speakers":[speakerid]}
// updates room and broadcasts to roomId / channel room-info on signal hub

const API = 'https://pantry.jam.systems/api/v1';

export function useApiQuery(path, doFetch = true) {
  let cached = use(state, 'queries')[path];
  let shouldFetch = path && doFetch && !cached;
  let [isLoading, setLoading] = useState(shouldFetch);

  let refetch = useCallback(async () => {
    let res = await fetch(API + path).catch(console.warn);
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
    if (shouldFetch) refetch();
    else setLoading(false);
  }, [shouldFetch, refetch]);

  let {data, status} = cached || {};
  return [data, isLoading, status, refetch];
}

function updateApiQuery(path, data, status) {
  state.queries[path] = data && {data, status};
  state.update('queries');
}

async function authenticatedApiRequest(method, token, path, payload) {
  let res = await fetch(API + path, {
    method: method.toUpperCase(),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

export async function get(path) {
  let res = await fetch(API + path, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
  if (res.status < 400) return res.json();
  else {
    let err = new Error();
    err.status = res.status;
    throw err;
  }
}

export async function post(token, path, payload) {
  return authenticatedApiRequest('POST', token, path, payload);
}

export async function put(token, path, payload) {
  return authenticatedApiRequest('PUT', token, path, payload);
}

export async function createRoom(roomId, name, description, peerId) {
  return post('', `/rooms/${roomId}`, {
    name,
    description,
    moderators: [peerId],
    speakers: [peerId],
  });
}
