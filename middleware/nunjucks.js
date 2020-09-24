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
    date: (date, format, inputFormat = 'DD/MM/YYYY' ) => {
      const momentDate = moment(date, inputFormat);
      if(momentDate.isValid()) {
        return momentDate.format(format);
      }
    },
    beforeToDay: (date) => {
      const momentDate = moment(date, 'DD/MM/YYYY');
      if(momentDate.isValid()) {
        return momentDate.isBefore(moment());
      }
    },
    includes: (roles, rolesToMatch) => {
      return roles.filter(role =>
        rolesToMatch.includes(role.name)
      ).length > 0 ? true : false;
    },
    formatDate: (date, format) => {
      const dateValue = moment(date);
      if(dateValue.isValid()) {
        return dateValue.format(format);
      }
    },
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
