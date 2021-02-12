const signalhub = require('signalhub')
const { jamHost } = require('../config')

const hub = function(roomId) {
    return signalhub(roomId, [
        `https://signalhub.${jamHost}/`
    ]);
}

module.exports = {
    hub,
};
