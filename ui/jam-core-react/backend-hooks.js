import {useCallback, useEffect, useState} from 'react';
import {use} from '../lib/state-tree-react';
import {useJam} from './JamContext';
import {signedToken} from '../lib/identity-utils';
import {apiUrl} from '../jam-core/backend';
import GetRequest from '../lib/GetRequest';

export {useApiQuery, useCreateRoom};

function useApiQuery(path, {dontFetch = false, fetchOnMount = false}) {
  const [state] = useJam();
  const getToken = useCallback(() => signedToken(state.myIdentity), []);
  let {data, isLoading, status} = use(GetRequest, {
    path: apiUrl() + path,
    dontFetch,
    fetchOnMount,
    getToken,
  });
  return [data, isLoading, status];
}

function useCreateRoom({roomId, shouldCreate, newRoom, onSuccess}) {
  const [, {createRoom}] = useJam();
  let [isError, setError] = useState(false);
  let [isLoading, setLoading] = useState(true);
  useEffect(() => {
    if (roomId && shouldCreate) {
      (async () => {
        let ok = await createRoom(roomId, newRoom);
        setLoading(false);
        if (ok) onSuccess?.();
        else setError(true);
      })();
    }
  }, [roomId, shouldCreate]);
  return [isLoading, isError];
}
