const express = require('express');
const nunjucks = require('middleware/nunjucks');
const webpack = require('middleware/webpack');
const pages = require('./pages');
const bodyParser = require('body-parser');
const logger = require('middleware/logger');
const helmet = require('middleware/helmet');
const cookieParser = require('cookie-parser');

const app = module.exports = express();

helmet.attach(app);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

nunjucks.configureViews(app);
nunjucks.configureNunjucks(app);

webpack.configure(app);

logger.attachRouteLogger(app);

pages.attach(app);

logger.attachErrorLogger(app);