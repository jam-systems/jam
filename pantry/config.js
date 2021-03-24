require('dotenv').config()

const jamHost = process.env.JAM_HOST || 'beta.jam.systems'
const local = process.env.LOCAL
const restrictRoomCreation = !!process.env.JAM_RESTRICT_ROOM_CREATION


module.exports = {
    jamHost,
    local,
    restrictRoomCreation
}
