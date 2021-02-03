const express = require('express');
const { hub } = require('../services/signalhub');
const { get, set } = require('../services/redis');


const controller = (prefix, authenticator, broadcastRoom, broadcastChannel) => {
    const redisKey = (req) => prefix + '/' + req.params.id;
    const router = express.Router();
    const path = `/${prefix}/:id`

    router.post(path, async function(req, res, next) {
        const key = redisKey(req);
        if(await get(key)) {
            res.sendStatus(409)
        } else {

            await set(key, req.body);
            res.send(req.body);
        }
    });
    router.get(path, async function(req, res, next) {

        const room = await get(redisKey(req));
        if(room) {
            res.send(room)
        } else {
            res.sendStatus(404)
        }
    });
    router.put(path, async function(req, res, next) {
        const key = redisKey(req);
        if(await get(key)) {
            set(key, req.body)
            if(broadcastRoom && broadcastChannel)
            hub(broadcastRoom(req.params.id)).broadcast(broadcastChannel(req.params.id), req.body)
            res.send(req.body)
        } else {
            res.sendStatus(404)
        }
    });
    return router;
}


module.exports = {controller};
