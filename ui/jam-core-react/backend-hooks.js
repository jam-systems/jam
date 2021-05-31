import {useCallback, useEffect, useState} from 'react';
import {use} from '../lib/state-tree-react';
import {useStateObject} from './JamContext';
import {signedToken} from '../lib/identity-utils';
import {GetRequest, createRoom} from '../jam-core';

export {useApiQuery, useCreateRoom, useRoom, useIdentityAdminStatus};

function useApiQuery(path, {dontFetch = false, fetchOnMount = false}) {
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

function useCreateRoom({
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
        let ok = await createRoom(state, roomId, newRoom);
        setLoading(false);
        if (ok) onSuccess?.();
        else setError(true);
      })();
    }
  }, [room, roomId, isRoomLoading]);
  return [isLoading, isError];
}

function useRoom(roomId) {
  const path = roomId && `/rooms/${roomId}`;
  let {data, isLoading, status} = use(GetRequest, {path});
  return [data, isLoading, status];
}

function useIdentityAdminStatus(id) {
  return useApiQuery(`/admin/${id}`, {fetchOnMount: true});
}
