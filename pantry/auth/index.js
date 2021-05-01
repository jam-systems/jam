const {get, set} = require('../services/redis');
const {permitAllAuthenticator} = require('../routes/controller');
const verifyIdentities = require('../verifications');
const {restrictRoomCreation} = require('../config');

const isAnyInList = (tokens, publicKeys) => {
  return tokens.some(token => publicKeys.includes(token));
};

const hasAccessToRoom = async (req, roomId) => {
  const roomInfo = await get('rooms/' + roomId);
  if (!roomInfo) return false;
  return isAnyInList(
    req.ssrIdentities,
    (roomInfo.access && roomInfo.access.identities) || []
  );
};

const isModerator = async (req, roomId) => {
  const roomInfo = await get('rooms/' + roomId);
  if (!roomInfo) return false;
  return isAnyInList(req.ssrIdentities, roomInfo['moderators']);
};

const identityIsAdmin = async identityKeys => {
  const adminKeys = await get('server/admins');
  return isAnyInList(identityKeys, adminKeys);
};

const isAdmin = async req => {
  return await identityIsAdmin(req.ssrIdentities);
};

const addAdmin = async serverAdminId => {
  const currentServerAdmins = await get('server/admins');
  if (currentServerAdmins && !currentServerAdmins.includes(serverAdminId)) {
    currentServerAdmins.push(serverAdminId);
    await set('server/admins', currentServerAdmins);
  } else {
    await set('server/admins', [serverAdminId]);
  }
};

const removeAdmin = async serverAdminId => {
  const currentServerAdmins = await get('server/admins');
  const newServerAdmins = currentServerAdmins.filter(e => e !== serverAdminId);
  await set('server/admins', newServerAdmins);
};

const initializeServerAdminIfNecessary = async req => {
  const admins = await get('server/admins');
  if (!admins || admins.length === 0) {
    await set('server/admins', [req.params.id]);
  }
};

const roomAuthenticator = {
  ...permitAllAuthenticator,
  canPost: async (req, res, next) => {
    if (restrictRoomCreation && !(await isAdmin(req))) {
      res.sendStatus(403);
      return;
    }

    const roomId = req.params.id;
    if (!/^[\w-]{4,}$/.test(roomId)) {
      res.sendStatus(403);
      return;
    }
    next();
  },
  canPut: async (req, res, next) => {
    const roomId = req.params.id;

    if (req.ssrIdentities.length === 0) {
      res.sendStatus(401);
      return;
    }
    if (!(await isModerator(req, roomId))) {
      res.sendStatus(403);
      return;
    }
    next();
  },
};

const identityAuthenticator = {
  ...permitAllAuthenticator,
  canPost: async (req, res, next) => {
    await initializeServerAdminIfNecessary(req);
    next();
  },
  canPut: async (req, res, next) => {
    if (req.ssrIdentities.length === 0) {
      res.sendStatus(401);
      return;
    }

    if (req.body.identities) {
      try {
        await verifyIdentities(req.body.identities, req.params.id);
      } catch (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'identity-verification-failed',
            message: error.message,
          },
        });
        return;
      }
    }

    await initializeServerAdminIfNecessary(req);
    next();
  },
};

module.exports = {
  isModerator,
  identityIsAdmin,
  isAdmin,
  addAdmin,
  removeAdmin,
  roomAuthenticator,
  identityAuthenticator,
  hasAccessToRoom,
};
