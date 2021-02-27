const express = require('express');
const cors = require('cors');
const logger = require('morgan');
const nacl = require('tweetnacl');
const base64 = require('compact-base64');
const nets = require("nets");
const { promisify } = require('util')

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
        console.log('in canPut');

        const authHeader = req.header("Authorization");
        if(authHeader) {
            const token = authHeader.substring(6);
            if(verify(token, req.params.id)) {
                console.log('in verify');

                if (req.body.tweet) {
                    console.log('in tweet');

                    let twitter = req.body.twitter;
                    let tweet = req.body.tweet

                    // only store tweet if it is verifiable
                    if (tweet.startsWith("https://twitter.com/" + twitter.substring(1) + "/status/")) {
                        console.log("tweet start ok");

                        let tweetResponse = await promisify(nets)({
                            url: tweet,
                            method: "GET",
                            headers: {
                            "User-Agent": "WhatsApp/2"
                            }
                        });

                        if (tweetResponse.body.includes(req.params.id)) {
                            console.log("verified");
                            next();
                        } else {
                            console.log("NOT verified");
                            res.sendStatus(400);
                        }
                    } else {
                        console.log("tweet start not ok");
                        res.sendStatus(400);
                    }
                } else {
                    next();
                }
            } else {
                res.sendStatus(403);
            }
        } else {
            res.sendStatus(401);
        }
    },
}


app.use('/', indexRouter);
app.use('/metrics', metricsRouter);
app.use('/api/v1/', controller('rooms', roomAuthenticator, (id) => id, () => 'room-info'));
app.use('/api/v1/', controller('identities', identityAuthenticator));


module.exports = app;
