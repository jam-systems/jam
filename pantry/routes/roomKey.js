const express = require('express');
const {isModerator, hasAccessToRoom} = require('../auth');
const {set, get} = require('../services/redis');

const router = express.Router({mergeParams: true});

const verifyModerator = async (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    res.sendStatus(401);
    return;
  }

  if (!(await isModerator(req, req.params.id))) {
    res.sendStatus(403);
    return;
  }

  next();
};

const verifyRoomKeyAccess = async (req, res, next) => {
  if (await isModerator(req, req.params.id)) {
    next();
    return;
  }

  if (await hasAccessToRoom(req, req.params.id)) {
    next();
    return;
  }

  res.sendStatus(403);
};

router.post('', verifyModerator, async function (req, res) {
  const roomId = req.params.id;
  await set(`rooms/${roomId}/roomKey`, req.body);
  res.json({success: true});
});

router.get('', verifyRoomKeyAccess, async (req, res) => {
  const roomId = req.params.id;
  const key = await get(`rooms/${roomId}/roomKey`);
  res.json(key);
});

module.exports = router;
