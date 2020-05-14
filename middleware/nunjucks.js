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
      const momentDate = moment(date, 'DD/MM/YYYY');
      if(momentDate.isValid()) {
        return momentDate.format(format);
      }
    },
    beforeToDay: (date) => {
      const momentDate = moment(date, 'DD/MM/YYYY');
      if(momentDate.isValid()) {
        return momentDate.isBefore(moment());
      }
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
