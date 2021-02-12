const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const logger = require('morgan');
const nacl = require('tweetnacl');
const base64 = require('compact-base64');

const indexRouter = require('./routes/index');
const {controller, permitAllAuthenticator} = require('./routes/controller');
const { get } = require('./services/redis');
const app = express();

app.use(logger('dev'));
app.use(cors());
app.use(bodyParser.json())
app.use(express.json());

const decode = (base64String) => Uint8Array.from(base64.decodeUrl(base64String, 'binary'));
const timeCodeFromBytes = (timeCodeBytes) => timeCodeBytes[0] +
    (timeCodeBytes[1] << 8) +
    (timeCodeBytes[2] << 16) +
    (timeCodeBytes[3] << 24);
const currentTimeCode = () => Math.round(Date.now() / 30000);

const verify = (authToken, key) => {
    const timeCodeBytes = nacl.sign.open(
        decode(authToken),
        decode(key)
    );
    return timeCodeBytes && timeCodeFromBytes(timeCodeBytes) === currentTimeCode();
}

const roomAuthenticator = {
    ...permitAllAuthenticator,
    canPut: async (req, res, next) => {
        const authHeader = req.header("Authorization");
        if(authHeader) {
            const token = authHeader.substring(6);
            console.log("Redis key: " + req.params.id)
            const roomInfo = await get('rooms/' + req.params.id);
            console.log('room info', roomInfo)
            for (const moderatorKey of roomInfo['moderators']) {
                if(verify(token, moderatorKey)) {
                    next();
                    break;
                }
            }
            res.sendStatus(403);
        } else {
            res.sendStatus(401);
        }
    },
}

const identityAuthenticator = {
    ...permitAllAuthenticator,
    canPut: (req, res, next) => {
        const authHeader = req.header("Authorization");
        if(authHeader) {
            const token = authHeader.substring(6);
            if(verify(token, req.params.id)) {
                next();
            } else {
                res.sendStatus(403);
            }
        } else {
            res.sendStatus(401);
        }
    },
}


app.use('/', indexRouter);
app.use('/api/v1/', controller('rooms', roomAuthenticator, (id) => id, () => 'room-info'));
app.use('/api/v1/', controller('identities', identityAuthenticator));

module.exports = app;
