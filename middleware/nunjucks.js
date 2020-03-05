const nunjucks = require('nunjucks');
const expressNunjucks = require('express-nunjucks');
const config = require('config');
const path = require('path');
const awaitFilter = require('nunjucks-await-filter');
const dateFilter = require('nunjucks-date-filter');

const isDev = config.env === 'development';

const nunjucksDefaults = {
  watch: isDev,
  noCache: isDev,
  loader: nunjucks.FileSystemLoader
};

const attach = app => {
  app.set('views', [
    path.join(__dirname, '..', 'node_modules', 'govuk-frontend'),
    path.join(__dirname, '..', 'common', 'views'),
    path.join(__dirname, '..', 'common', 'views'),
    path.join(__dirname, '..', 'pages')
  ]);

  const environment = expressNunjucks(
    app,
    nunjucksDefaults
  );
  awaitFilter(environment.env);
  environment.env.addFilter('date', dateFilter);
};

module.exports = { attach };