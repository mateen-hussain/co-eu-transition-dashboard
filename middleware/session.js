const session = require('express-session');

const attach = app => {
  app.use(session({
    secret: 'keyboard cat'
  }))
};

module.exports = {
  attach
};