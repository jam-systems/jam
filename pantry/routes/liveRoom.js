const express = require('express');
const {get} = require('../services/redis');
const {activeUsersInRoom} = require('../services/ws');

const router = express.Router({mergeParams: true});

router.get('', async (req, res) => {
  let roomId = req.params.id;
  let peerIds = await activeUsersInRoom(roomId);
  console.log(`user ids in room ${roomId}`, peerIds);
  let users = await Promise.all(peerIds.map(id => get(`identities/${id}`)));
  console.log(`users in room ${roomId}`, users);
  res.json(users);
});

module.exports = router;
