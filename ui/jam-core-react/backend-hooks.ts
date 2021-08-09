import {useCallback} from 'react';
import {use} from '../lib/state-tree-react';
import {useJam} from './JamContext';
import {signedToken} from '../lib/identity-utils';
import {apiUrl} from '../jam-core/backend';
import GetRequest from '../lib/GetRequest';

export {useApiQuery};

function useApiQuery(
  path: string,
  {dontFetch = false, fetchOnMount = false} = {}
) {
  const [state] = useJam();
  const getToken = useCallback(() => signedToken(state.myIdentity), []);
  let {data, isLoading, status} = use(GetRequest, {
    path: apiUrl() + path,
    dontFetch,
    fetchOnMount,
    getToken,
  });
  return [data as unknown, isLoading as boolean, status as number] as const;
}
