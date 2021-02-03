import {useCallback, useEffect, useState} from 'react';
import {sign} from "./lib/identity";

// POST https://pantry.jam.systems/api/v1/rooms/:roomId {"moderators": [moderatorId], "speakers":[speakerid]}
// Creates room, returns 409 conflict if room exists

// GET https://pantry.jam.systems/api/v1/rooms/:roomId
// returns {"moderators": [moderatorId], "speakers":[speakerid]}

// PUT https://pantry.jam.systems/api/v1/rooms/:roomId {"moderators": [moderatorId], "speakers":[speakerid]}
// updates room and broadcasts to roomId / channel room-info on signal hub

const API = 'https://pantry.jam.systems/api/v1';


const signedToken = function() {
  const dateToken = Math.round(Date.now() / 30000);
  const signData = Uint8Array.of(dateToken % 256, (dateToken >> 16) % 256, (dateToken >> 24) % 256);
  return sign(signData);
}


export function useIsRoomNew(roomId, doFetch = true) {
  let [[isNew, isLoading], setState] = useState([false, true]);
  let refetch = useCallback(() =>
    fetch(`${API}/rooms/${roomId}`).then(res => {
      if (res.status >= 400) {
        setState([true, false]);
      } else {
        setState([false, false]);
      }
    })
  );
  useEffect(() => {
    if (roomId && doFetch) refetch();
  }, [roomId, doFetch]);
  return [isNew, isLoading, refetch];
}

export async function createRoom(roomId, peerId) {
  let res = await fetch(`${API}/rooms/${roomId}`, {
    method: 'POST',
    body: JSON.stringify({
      moderators: [peerId],
      speakers: [peerId],
    }),
  });
  return res.ok;
}
