const {get, set} = require('./redis');
const {serverAdminId} = require('../config');
const {addAdmin} = require('../auth');

const initDb = async () => {
  if (serverAdminId && serverAdminId.length > 0) {
    await addAdmin(serverAdminId);
  }
};

module.exports = initDb;
