const {get, set} = require('./redis');
const {serverAdminId} = require('../config');

const initDb = async () => {
    if(serverAdminId && serverAdminId.length > 0) {
        const currentServerAdmins = await get('server/admins');
        if(currentServerAdmins && !currentServerAdmins.includes(serverAdminId)) {
            currentServerAdmins.push(serverAdminId);
            await set('server/admins', currentServerAdmins);
        } else {
            await set('server/admins', [serverAdminId]);
        }
    }
}

module.exports = initDb;
