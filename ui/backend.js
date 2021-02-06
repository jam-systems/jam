import {useCallback, useEffect, useState} from 'react';
import {sign} from './lib/identity';
import use from './lib/use-state';
import {state} from './main';

// POST https://pantry.jam.systems/api/v1/rooms/:roomId {"moderators": [moderatorId], "speakers":[speakerid]}
// Creates room, returns 409 conflict if room exists

// GET https://pantry.jam.systems/api/v1/rooms/:roomId
// returns {"moderators": [moderatorId], "speakers":[speakerid]}

// PUT https://pantry.jam.systems/api/v1/rooms/:roomId {"moderators": [moderatorId], "speakers":[speakerid]}
// updates room and broadcasts to roomId / channel room-info on signal hub

const API = 'https://pantry.jam.systems/api/v1';

// TODO
function signedToken() {
  const dateToken = Math.round(Date.now() / 30000);
  const signData = Uint8Array.of(
    dateToken % 256,
    (dateToken >> 16) % 256,
    (dateToken >> 24) % 256
  );
  return sign(signData);
}

export function useApiQuery(path, doFetch = true) {
  let cached = use(state, 'queries')[path];
  let shouldFetch = path && doFetch && !cached;
  let [isLoading, setLoading] = useState(shouldFetch);

  let refetch = useCallback(async () => {
    let res = await fetch(API + path);
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

export async function createRoom(roomId, name, description, peerId) {
  let res = await fetch(`${API}/rooms/${roomId}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name,
      description: description,
      moderators: [peerId],
      speakers: [peerId],
    }),
  });
  return res.ok;
}
