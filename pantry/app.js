const express = require('express');
const cors = require('cors');
const logger = require('morgan');
const nacl = require('tweetnacl');
const base64 = require('compact-base64');

const verifyIdentities = require("./verifications");
const indexRouter = require('./routes/index');
const metricsRouter = require('./routes/metrics');

const {controller, permitAllAuthenticator} = require('./routes/controller');
const { get } = require('./services/redis');
const app = express();

app.use(logger('dev'));
app.use(cors());
app.use(express.json({limit: "500kb"}));

const decode = (base64String) => Uint8Array.from(base64.decodeUrl(base64String, 'binary'));
const timeCodeFromBytes = (timeCodeBytes) => timeCodeBytes[0] +
    (timeCodeBytes[1] << 8) +
    (timeCodeBytes[2] << 16) +
    (timeCodeBytes[3] << 24);
const currentTimeCode = () => Math.round(Date.now() / 30000);
const timeCodeValid = code => Math.abs(code - currentTimeCode()) <= 1;

const verify = (authToken, key) => {
    const timeCodeBytes = nacl.sign.open(
        decode(authToken),
        decode(key)
    );
    return (
      timeCodeBytes &&
      timeCodeValid(timeCodeFromBytes(timeCodeBytes))
    );
}

const roomAuthenticator = {
    ...permitAllAuthenticator,
    canPut: async (req, res, next) => {
        const authHeader = req.header("Authorization");
        if(authHeader) {
            const token = authHeader.substring(6);
            const roomInfo = await get('rooms/' + req.params.id);
            let authenticated = false;
            for (const moderatorKey of roomInfo['moderators']) {
                if(verify(token, moderatorKey)) {
                    authenticated = true;
                    break;
                }
            }
            if(authenticated) {
                next();
            } else {
                res.sendStatus(403);
            }
        } else {
            res.sendStatus(401);
        }
    },
}

const identityAuthenticator = {
    ...permitAllAuthenticator,
    canPut: async (req, res, next) => {
        const authHeader = req.header("Authorization");

        if(!authHeader) {
            res.sendStatus(401);
            return
        }

        const token = authHeader.substring(6);
        if(!verify(token, req.params.id)) {
            res.sendStatus(403);
            return
        }

        if(req.body.identities) {
            try {
                await verifyIdentities(req.body.identities, req.params.id);
                next();
            } catch(error) {
                res.status(400).json(
                    {
                        success: false,
                        error: {
                            code: "identity-verification-failed",
                            message: error.message
                        }
                    });
            }
        } else {
            next();
        }
    },
}


app.use('/', indexRouter);
app.use('/metrics', metricsRouter);
app.use('/api/v1/', controller('rooms', roomAuthenticator, (id) => id, () => 'room-info'));
app.use('/api/v1/', controller('identities', identityAuthenticator));


module.exports = app;
