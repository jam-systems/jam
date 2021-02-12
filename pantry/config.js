require('dotenv').config()

const jamHost = process.env.JAM_HOST
const local = process.env.LOCAL


module.exports = {
    jamHost,
    local
}
