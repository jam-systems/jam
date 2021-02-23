const signalhub = require('signalhub')
const { jamHost } = require('../config')
const nets = require('nets')


const signalHubUrl = `https://signalhub.${jamHost}/`;
const hub = function(roomId) {
    return signalhub(roomId, [
        signalHubUrl
    ]);
}

const activeUserCount = async () => Math.floor((await promisify(nets)({url: signalHubUrl})).subscribers / 6);

module.exports = {
    hub,
    activeUserCount
};
