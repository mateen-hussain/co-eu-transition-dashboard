const helmet = require('helmet');
const config = require('config');

const attach = app => {
  app.use(helmet());

  const frameSrc = [];
  if(config.services.tableau.url) {
    frameSrc.push(config.services.tableau.url);
  }else {
    frameSrc.push('\'none\'');
  }

  // Helmet content security policy (CSP) to allow only assets from same domain.
  app.use(helmet.contentSecurityPolicy({
    directives: {
      fontSrc: ['\'self\' data:'],
      scriptSrc: ['\'self\'', '\'unsafe-eval\'', '\'unsafe-inline\'', 'www.google-analytics.com', 'www.googletagmanager.com', 'connectors.tableau.com', 'ajax.googleapis.com'],
      connectSrc: ['\'self\''],
      mediaSrc: ['\'self\''],
      frameSrc,
      imgSrc: ['\'self\'', '\'self\' data:', 'www.google-analytics.com']
    }
  }));

  // Helmet referrer policy
  app.use(helmet.referrerPolicy({ policy: 'origin' }));
};

module.exports = { attach };
