const express = require('express');
const cors = require('cors');
const logger = require('morgan');

const {ssr} = require('./ssr');

require('./services/initDb')();

const indexRouter = require('./routes/index');
const metricsRouter = require('./routes/metrics');
const adminRouter = require('./routes/admin');

const {roomAuthenticator, identityAuthenticator} = require('./auth');
const {controller} = require('./routes/controller');
const roomKeyRouter = require('./routes/roomKey');
const app = express();

app.use(logger('dev'));
app.use(cors());
app.use(express.json({limit: '500kb'}));
app.use(ssr);

app.use('/', indexRouter);
app.use('/metrics', metricsRouter);

app.use(
  '/api/v1/',
  controller(
    'rooms',
    roomAuthenticator,
    id => id,
    () => 'room-info'
  )
);
app.use('/api/v1/rooms/:id/roomKey', roomKeyRouter);

app.use('/api/v1/', controller('identities', identityAuthenticator));

app.use('/api/v1/admin/', adminRouter);

module.exports = app;
