const signalhub = require('signalhub')

const hub = function(roomId) {
    return signalhub(roomId, [
        'https://signalhub.jam.systems/'
    ]);
}
module.exports = {
    hub,
};
