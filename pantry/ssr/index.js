const base64 = require('compact-base64');
const { data } = require('simple-signed-records-engine');



const extractToken = (req) => {
    const authHeader = req.header("Authorization") || '';
    return authHeader.substring(6);
}


const ssr = (req, res, next) => {
    const method = req.method;
    req.ssrIdentities = [];
    switch (method) {
        case 'GET':
        case 'DELETE':
            {
                const record = base64.decode(extractToken(req));
                const verifiedRecord = data(record);
                if (verifiedRecord) {
                    req.ssrIdentities = verifiedRecord.identities;
                }
            }
            break;
        case 'POST':
        case 'PUT':
            {
                const record = req.body;
                const verifiedRecord = data(record);
                if (verifiedRecord) {
                    req.ssrIdentities = verifiedRecord.identities;
                    req.body = verifiedRecord.data;
                }
            }
            break;
        default:
    }
    next();
}

module.exports = {
    ssr
}
