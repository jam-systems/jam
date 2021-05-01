const express = require('express');
const {isAdmin, addAdmin, removeAdmin, identityIsAdmin} = require('../auth');

const router = express.Router({mergeParams: true});

const verifyAdmin = async (req, res, next) => {
  if (await isAdmin(req)) {
    next();
    return;
  }
  res.sendStatus(403);
};

router.get('/:identity', async (req, res) => {
  res.json({admin: await identityIsAdmin([req.params.identity])});
});

router.post('/:identity', verifyAdmin, async (req, res) => {
  const serverAdminId = req.params.identity;
  await addAdmin(serverAdminId);
  res.json({success: true});
});

router.delete('/:identity', verifyAdmin, async (req, res) => {
  const serverAdminId = req.params.identity;
  await removeAdmin(serverAdminId);
  res.json({success: true});
});

module.exports = router;
