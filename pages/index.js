const glob = require('glob');
const path = require('path');

const attach = app => {
  glob.sync('./pages/**/*.js', { "ignore":['./pages/index.js'] }).forEach(file => {
    const Page = require(path.resolve(file));
    if (Page.isEnabled) {
      const p = new Page(path.resolve(file, '..'));
      app.use(p.router);
    }
  });
};

module.exports = {
  attach
};
