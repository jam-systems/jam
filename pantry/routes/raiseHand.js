const express = require('express');
const {verify, isModerator} = require('../auth');
const {set, del, list} = require('../services/redis');
const {hub} = require('../services/signalhub');

const router = express.Router({mergeParams: true});

const verifyPost = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    res.sendStatus(401);
    return;
  }

  const token = authHeader.substring(6);
  console.log('req params', req.params);
  if (!verify(token, req.params.identityKey)) {
    res.sendStatus(403);
    return;
  }

  next();
};

const verifyModerator = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    res.sendStatus(401);
    return;
  }

  if (!isModerator(req, req.params.id)) {
    res.sendStatus(403);
    return;
  }

  next();
};

router.post('/:identityKey', verifyPost, async function (req, res) {
  const roomId = req.params.id;
  const identityKey = req.params.identityKey;
  await set(`rooms/${roomId}/raisedHands/${identityKey}`, true);
  hub(roomId).broadcast('anonymous', {raisedHands: true});
  res.json({success: true});
});

router.delete('/:identityKey', verifyPost, async function (req, res) {
  const roomId = req.params.id;
  const identityKey = req.params.identityKey;
  await del(`rooms/${roomId}/raisedHands/${identityKey}`);
  hub(roomId).broadcast('anonymous', {raisedHands: true});
  res.json({success: true});
});

router.get('', verifyModerator, async (req, res) => {
  const roomId = req.params.id;
  const prefix = `rooms/${roomId}/raisedHands/`;
  const raisedHands = (await list(prefix)).map(key => key.replace(prefix, ''));
  res.json(raisedHands);
});

module.exports = router;
