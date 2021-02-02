const express = require('express');
const router = express.Router();
const signalhub = require('signalhub')

const hub = function(roomId) {
    return signalhub(roomId, [
        'https://signalhub.jam.systems/'
    ]);
}



const rooms = {};


router.post('/rooms/:roomId', function(req, res, next) {
    console.log(rooms);
    if(rooms[req.params.roomId]) {
        res.sendStatus(409)
    } else {

        rooms[req.params.roomId] = req.body;
        res.send(req.body);
    }
});
router.get('/rooms/:roomId', function(req, res, next) {
    if(rooms[req.params.roomId]) {
        res.send(rooms[req.params.roomId])
    } else {
        res.sendStatus(404)
    }
});
router.put('/rooms/:roomId', function(req, res, next) {
    if(rooms[req.params.roomId]) {
        rooms[req.params.roomId] = req.body
        hub(req.params.roomId).broadcast("room-info", req.body)
        res.send(rooms[req.body])
    } else {
        res.sendStatus(404)
    }
});



module.exports = router;
