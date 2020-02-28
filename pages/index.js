const glob = require('glob');
const config = require('config');
const path = require('path');

const attach = app => {
  const pages = [];

  glob.sync('./pages/**/*.js', {"ignore":['./pages/index.js']}).forEach(file => {
    const Page = require(path.resolve(file));
    const p = new Page(path.resolve(file, '..'));
    app.use(p.router);
  });
};

module.exports = {
  attach
};
