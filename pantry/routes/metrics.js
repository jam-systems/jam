const express = require('express');
const { activeUserCount } = require('../services/signalhub');
const { roomCount, identityCount } = require('../services/redis');
const { promisify } = require("util");




const router = express.Router();

router.get('', async function(req, res, next) {
    const roomCount = await roomCount();
    const identityCount = await identityCount();
    const activeUserCount = await activeUserCount();

    res.send(
        `jam_rooms_total ${roomCount}\n` +
        `jam_identities_total ${identityCount}\n` +
        `jam_users_active ${activeUserCount}\n`
    )
});


module.exports = router;
