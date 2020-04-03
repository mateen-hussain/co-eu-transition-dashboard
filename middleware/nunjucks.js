const nunjucks = require('nunjucks');
const expressNunjucks = require('express-nunjucks');
const config = require('config');
const path = require('path');
const awaitFilter = require('nunjucks-await-filter');
const moment = require('moment');

const isDev = config.env === 'development';

const nunjucksDefaults = {
  watch: isDev,
  noCache: isDev,
  loader: nunjucks.FileSystemLoader,
  filters: {
    date: (date, format) => {
      return moment(date, 'DD/MM/YYYY').format(format);
    },
    beforeToDay: (date) => {
      return moment(date, 'DD/MM/YYYY').isBefore(moment());
    }
  }
};

const attach = app => {
  app.set('views', [
    path.join(__dirname, '..', 'node_modules', 'govuk-frontend'),
    path.join(__dirname, '..', 'common', 'views'),
    path.join(__dirname, '..', 'common', 'macros'),
    path.join(__dirname, '..', 'pages')
  ]);

  const environment = expressNunjucks(
    app,
    nunjucksDefaults
  );
  awaitFilter(environment.env);
};

module.exports = { attach };
