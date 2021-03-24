const nacl = require('tweetnacl');
const base64 = require('compact-base64');
const { get, set } = require('../services/redis');
const { permitAllAuthenticator } = require('../routes/controller');
const verifyIdentities = require("../verifications");
const { restrictRoomCreation } = require('../config');

const decode = (base64String) => Uint8Array.from(base64.decodeUrl(base64String, 'binary'));
const timeCodeFromBytes = (timeCodeBytes) => timeCodeBytes[0] +
    (timeCodeBytes[1] << 8) +
    (timeCodeBytes[2] << 16) +
    (timeCodeBytes[3] << 24);
const currentTimeCode = () => Math.round(Date.now() / 30000);
const timeCodeValid = code => Math.abs(code - currentTimeCode()) <= 10;

const verify = (authToken, key) => {
    const timeCodeBytes = nacl.sign.open(
        decode(authToken),
        decode(key)
    );
    return (
        timeCodeBytes &&
        timeCodeValid(timeCodeFromBytes(timeCodeBytes))
    );
}

const extractToken = (req) => {
    const authHeader = req.header("Authorization") || '';
    return authHeader.substring(6);
}

const isInList = (token, publicKeys) => {
    for (const key of publicKeys)
    {
        if (verify(token, key)) {
            return true;
        }
    }
    return false
}


const isModerator = async (req, roomId) => {
    const roomInfo = await get('rooms/' + roomId);
    if (!roomInfo) return false;
    return isInList(extractToken(req), roomInfo['moderators']);
}

const isAdmin = async (req) => {
    return isInList(extractToken(req), await get('server/admins'));
}

const roomAuthenticator = {
    ...permitAllAuthenticator,
    canPost: async (req, res, next) => {
        if(restrictRoomCreation && !(await isAdmin(req)))
        {
            res.sendStatus(403);
            return;
        }

        const roomId = req.params.id;
        if(!/^[\w-]{4,}$/.test(roomId)) {
            res.sendStatus(403);
            return;
        }
        next();
    },
    canPut: async (req, res, next) => {
        const roomId = req.params.id;

        if(!req.header("Authorization")) {
            res.sendStatus(401);
            return
        }
        if(!isModerator(req, roomId)) {
            res.sendStatus(403);
            return
        }
        next();
    }
}

const identityAuthenticator = {
    ...permitAllAuthenticator,
    canPost: async (req, res, next) => {
        const moderators = await get('server/admins');
        if(!moderators || moderators.length === 0) {
            await set('server/admins', [req.params.id])
        }
        next()
    },
    canPut: async (req, res, next) => {
        const authHeader = req.header("Authorization");

        if(!authHeader) {
            res.sendStatus(401);
            return
        }

        const token = authHeader.substring(6);
        if(!verify(token, req.params.id)) {
            res.sendStatus(403);
            return
        }

        if(req.body.identities) {
            try {
                await verifyIdentities(req.body.identities, req.params.id);
                next();
            } catch(error) {
                res.status(400).json(
                    {
                        success: false,
                        error: {
                            code: "identity-verification-failed",
                            message: error.message
                        }
                    });
            }
        } else {
            next();
        }
    },
}

module.exports = {verify, isModerator, isAdmin, roomAuthenticator, identityAuthenticator}
