const base64 = require('compact-base64');
const {data} = require('simple-signed-records-engine');

const extractToken = req => {
  const authHeader = req.header('Authorization') || '';
  return authHeader.substring(6);
};

const ssr = (req, res, next) => {
  const method = req.method;
  req.ssrIdentities = [];
  switch (method) {
    case 'GET':
      {
        let verifiedRecord;
        try {
          let record = JSON.parse(base64.decode(extractToken(req)));
          verifiedRecord = data(record);
        } catch (_) {}
        if (verifiedRecord) {
          req.ssrIdentities = verifiedRecord.identities.map(
            base64.originalToUrl
          );
        }
      }
      break;
    case 'DELETE':
    case 'POST':
    case 'PUT':
      {
        const record = req.body;
        const verifiedRecord = data(record);
        if (verifiedRecord) {
          req.ssrIdentities = verifiedRecord.identities.map(
            base64.originalToUrl
          );
          req.body = verifiedRecord.data;
        }
      }
      break;
    default:
  }
  next();
};

function ssrVerifyToken(token, publicKey) {
  let identities;
  try {
    let record = JSON.parse(base64.decode(token));
    identities = data(record).identities;
  } catch (_) {}
  if (identities === undefined) return false;
  return identities.includes(base64.urlToOriginal(publicKey));
}

module.exports = {
  ssr,
  ssrVerifyToken,
};
