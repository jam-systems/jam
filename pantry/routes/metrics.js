const express = require('express');
const { activeUserCount } = require('../services/signalhub');
const { roomCount, identityCount } = require('../services/redis');




const router = express.Router();

router.get('', async function(req, res, next) {

    res.send(
        `jam_rooms_total ${await roomCount()}\n` +
        `jam_identities_total ${await identityCount()}\n` +
        `jam_users_active ${await activeUserCount()}\n`
    )
});


module.exports = router;
