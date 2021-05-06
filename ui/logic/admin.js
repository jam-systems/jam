import {post, deleteRequest, useApiQuery} from './backend';

export const useIdentityAdminStatus = id => {
  return useApiQuery(`/admin/${id}`, {fetchOnMount: true});
};

export const addAdmin = async id => {
  await post(`/admin/${id}`, {});
};

export const removeAdmin = async id => {
  await deleteRequest(`/admin/${id}`, {});
};
