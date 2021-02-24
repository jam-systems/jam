const signalhub = require('signalhub')
const { jamHost } = require('../config')
const nets = require('nets')
const { promisify } = require('util')


const signalHubUrl = `https://${jamHost}/_/signalhub/`;
const hub = function(roomId) {
    return signalhub(roomId, [
        signalHubUrl
    ]);
}

const activeUserCount = async () => Math.floor(JSON.parse((await promisify(nets)({url: signalHubUrl, encoding: undefined})).body).subscribers / 6);

module.exports = {
    hub,
    activeUserCount
};
