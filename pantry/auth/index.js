const nacl = require('tweetnacl');
const base64 = require('compact-base64');
const { get } = require('../services/redis');



const decode = (base64String) => Uint8Array.from(base64.decodeUrl(base64String, 'binary'));
const timeCodeFromBytes = (timeCodeBytes) => timeCodeBytes[0] +
    (timeCodeBytes[1] << 8) +
    (timeCodeBytes[2] << 16) +
    (timeCodeBytes[3] << 24);
const currentTimeCode = () => Math.round(Date.now() / 30000);
const timeCodeValid = code => Math.abs(code - currentTimeCode()) <= 1;

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

const isModerator = async (req, roomId) => {
    const authHeader = req.header("Authorization");
    const token = authHeader.substring(6);
    const roomInfo = await get('rooms/' + roomId);
    if (!roomInfo) return false;
    for (const moderatorKey of roomInfo['moderators']) {
        if (verify(token, moderatorKey)) {
            return true;
        }
    }
    return false;
}

module.exports = {verify, isModerator}
