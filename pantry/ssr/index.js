const base64 = require('compact-base64');
const {data} = require('simple-signed-records-engine');
// const {data} = require('./ssr-engine');

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
        } else {
          // if data is in ssr format, it has to be unpacked even if signatures don't verify
          // otherwise routes that don't check identities might accidently use packed data
          if (record.Certified) req.body = unpack(record);
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
    let record = JSON.parse(base64.decodeUrl(token));
    identities = data(record).identities;
  } catch (_) {}
  if (identities === undefined) return false;
  return identities.includes(base64.urlToOriginal(publicKey));
}

function unpack(data) {
  return JSON.parse(Buffer.from(data.Certified, 'base64').toString('utf-8'));
}

module.exports = {
  ssr,
  ssrVerifyToken,
};
