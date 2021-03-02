const express = require('express');
const {verify, isModerator} = require('../auth');
const { set, del, list } = require('../services/redis');
const { hub } = require('../services/signalhub');



const router = express.Router();

const verifyHandler = (req, res, next) => {
    const authHeader = req.header("Authorization");

    if(!authHeader) {
        res.sendStatus(401);
        return
    }

    const token = authHeader.substring(6);
    if(!verify(token, req.params.identityKey)) {
        res.sendStatus(403);
        return
    }

    next()

}



router.post('/:identityKey', verifyHandler, async function(req, res) {
    const roomId = req.params.id;
    const identityKey = req.params.identityKey;
    await set(`/rooms/${roomId}/raisedHands/${identityKey}`, true);
    hub(roomId).broadcast("raised-hands-changed", "ping");
    res.json({success: true});
});

router.delete('/:identityKey', verifyHandler, async function(req, res) {
    const roomId = req.params.id;
    const identityKey = req.params.identityKey;
    await del(`/rooms/${roomId}/raisedHands/${identityKey}`);
    hub(roomId).broadcast("raised-hands-changed", "ping");
    res.json({success: true});
});

router.get('', async (req, res) => {
    const roomId = req.params.id;
    if(!isModerator(req, roomId)) {
        res.sendStatus(403);
    } else {
        const prefix = `/rooms/${roomId}/raisedHands/`;
        const raisedHands = (await list(prefix)).map((key) => key.replace(prefix, ''));
        res.json(raisedHands);
    }
});


module.exports = router;
