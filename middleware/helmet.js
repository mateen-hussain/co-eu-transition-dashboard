const helmet = require('helmet');

const attach = app => {
  app.use(helmet());

  // Helmet content security policy (CSP) to allow only assets from same domain.
  app.use(helmet.contentSecurityPolicy({
    directives: {
      fontSrc: ['\'self\' data:'],
      scriptSrc: ['\'self\'', '\'unsafe-eval\'', '\'unsafe-inline\'', 'www.google-analytics.com', 'www.googletagmanager.com'],
      connectSrc: ['\'self\''],
      mediaSrc: ['\'self\''],
      frameSrc: ['\'none\''],
      imgSrc: ['\'self\'', '\'self\' data:', 'www.google-analytics.com']
    }
  }));

  // Helmet referrer policy
  app.use(helmet.referrerPolicy({ policy: 'origin' }));
};

module.exports = { attach };
