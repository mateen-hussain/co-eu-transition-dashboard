const express = require('express');
const nunjucks = require('middleware/nunjucks');
const webpack = require('middleware/webpack');
const pages = require('./pages');
const bodyParser = require('body-parser');
const logger = require('middleware/logger');
const helmet = require('middleware/helmet');
const cookieParser = require('cookie-parser');
const config = require('config');

const app = module.exports = express();

helmet.attach(app);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

nunjucks.attach(app);
webpack.configure(app);

logger.attachRouteLogger(app);

pages.attach(app);
app.get('/', (req, res) => res.redirect(config.paths.allData));

logger.attachErrorLogger(app);