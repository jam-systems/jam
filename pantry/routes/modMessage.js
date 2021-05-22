// TODO: This file is currently UNUSED but may contain code that's useful another time

const express = require('express');
const {isModerator} = require('../auth');
const {set, get, del, list} = require('../services/redis');
const {broadcast} = require('../services/ws');

const router = express.Router({mergeParams: true});

const verifyIdentity = (req, res, next) => {
  if (!req.ssrIdentities.includes(req.params.identityKey)) {
    res.sendStatus(403);
    return;
  }
  next();
};

const verifyModerator = async (req, res, next) => {
  if (!(await isModerator(req, req.params.id))) {
    res.sendStatus(403);
    return;
  }
  next();
};

router.post('/:identityKey', verifyIdentity, async function (req, res) {
  const roomId = req.params.id;
  const identityKey = req.params.identityKey;
  await set(`rooms/${roomId}/modMessage/${identityKey}`, req.body);
  broadcast(roomId, 'mod-message');
  res.json({success: true});
});

router.delete('/:identityKey', verifyIdentity, async function (req, res) {
  const roomId = req.params.id;
  const identityKey = req.params.identityKey;
  await del(`rooms/${roomId}/modMessage/${identityKey}`);
  broadcast(roomId, 'mod-message');
  res.json({success: true});
});

router.get('', verifyModerator, async (req, res) => {
  const roomId = req.params.id;
  const prefix = `rooms/${roomId}/modMessage/`;
  let modMessages = {};
  let keys = await list(prefix);
  for (let key of keys) {
    let id = key.slice(prefix.length);
    modMessages[id] = await get(key);
  }
  res.json(modMessages);
});

module.exports = router;
