const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const {controller} = require('./routes/controller');
const app = express();

app.use(logger('dev'));
app.use(cors());
app.use(bodyParser.json())
app.use(express.json());

app.use('/', indexRouter);
app.use('/api/v1/', controller('rooms', null, (id) => id, () => 'room-info'));
app.use('/api/v1/', controller('identities'));

module.exports = app;
