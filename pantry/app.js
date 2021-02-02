const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api');
const app = express();

app.use(logger('dev'));
app.use(cors());
app.use(bodyParser.json())
app.use(express.json());

app.use('/', indexRouter);
app.use('/api/v1/', apiRouter);

module.exports = app;
