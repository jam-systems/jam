import {post, deleteRequest, useApiQuery} from './backend';

export const useIdentityAdminStatus = id => {
  return useApiQuery(`/admin/${id}`, {fetchOnMount: true});
};

export const addAdmin = async (state, id) => {
  await post(state, `/admin/${id}`, {});
};

export const removeAdmin = async (state, id) => {
  await deleteRequest(state, `/admin/${id}`, {});
};
