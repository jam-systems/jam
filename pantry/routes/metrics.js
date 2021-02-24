const express = require('express');
const { activeUserCount } = require('../services/signalhub');
const { roomCount, identityCount } = require('../services/redis');




const router = express.Router();

router.get('', async function(req, res, next) {
    res.type('text/plain; version=0.0.4');
    res.send(
        `# TYPE jam_rooms_total counter\n` +
        `jam_rooms_total ${await roomCount()}\n` +
        `# TYPE jam_identities_total counter\n` +
        `jam_identities_total ${await identityCount()}\n` +
        `# TYPE jam_users_active gauge\n` +
        `jam_users_active ${await activeUserCount()}\n`
    )
});


module.exports = router;
