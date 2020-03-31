const glob = require('glob');
const path = require('path');
const pages = require('pages/index');
const { expect } = require('test/unit/util/chai');

describe('Pages', () => {
  it('finds and attaches to app', () => {
    const allPageNames = []
    glob.sync('./pages/**/*.js', { "ignore":['./pages/index.js'] }).forEach(file => {
      const Page = require(path.resolve(file));
      allPageNames.push(new Page().constructor.name);
    });

    const pagesAttached = [];
    const use = r => pagesAttached.push(r.page.constructor.name);

    pages.attach({ use });

    allPageNames.forEach(name => expect(pagesAttached).to.include(name));
  });
});