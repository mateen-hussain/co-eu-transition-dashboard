const express = require('express');
const nunjucks = require('./middleware/nunjucks');
const webpack = require('./middleware/webpack');
const session = require('./middleware/session');
const pages = require('./pages');
const bodyParser = require('body-parser');
const logger = require('middleware/logger');

const app = module.exports = express();

app.use(bodyParser.urlencoded({ extended: false }));

nunjucks.configureViews(app);
nunjucks.configureNunjucks(app);

webpack.configure(app);

session.attach(app);

logger.attachRouteLogger(app);

pages.attach(app);

logger.attachErrorLogger(app);