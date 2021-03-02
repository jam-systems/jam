const express = require('express');
const cors = require('cors');
const logger = require('morgan');

const verifyIdentities = require("./verifications");
const indexRouter = require('./routes/index');
const metricsRouter = require('./routes/metrics');

const {verify, isModerator} = require('./auth');
const {controller, permitAllAuthenticator} = require('./routes/controller');
const raiseHandRouter = require('./routes/raiseHand');
const app = express();

app.use(logger('dev'));
app.use(cors());
app.use(express.json({limit: "500kb"}));


const roomAuthenticator = {
    ...permitAllAuthenticator,
    canPost: (req, res, next) => {
        const roomId = req.params.id;
        if(/^[\w-]{4,}$/.test(roomId)) {
            next();
        } else {
            res.sendStatus(403);
        }
    },
    canPut: async (req, res, next) => {
        const roomId = req.params.id;

        if(!req.header("Authorization")) {
            res.sendStatus(401);
            return
        }
        if(!isModerator(req, roomId)) {
            res.sendStatus(403);
            return
        }
        next();
    }
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
app.use('/api/v1/rooms/:id/raisedHands', raiseHandRouter);

app.use('/api/v1/', controller('identities', identityAuthenticator));


module.exports = app;
