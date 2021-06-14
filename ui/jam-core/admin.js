import {post, deleteRequest} from './backend';

export const addAdmin = async (state, id) => {
  return await post(state, `/admin/${id}`, {});
};

export const removeAdmin = async (state, id) => {
  return await deleteRequest(state, `/admin/${id}`, {});
};
