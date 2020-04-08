const glob = require('glob');
const path = require('path');
const config = require('config');
const pages = require('pages/index');
const { expect, sinon } = require('test/unit/util/chai');

describe('Pages', () => {
  it('finds and attaches to app', () => {
    const sandbox = sinon.createSandbox();
    sandbox.stub(config, 'features').value({
      missedMilestones: true
    });

    const allPageNames = []
    glob.sync('./pages/**/*.js', { "ignore":['./pages/index.js'] }).forEach(file => {
      const Page = require(path.resolve(file));
      allPageNames.push(new Page().constructor.name);
    });

    const pagesAttached = [];
    const use = r => pagesAttached.push(r.page.constructor.name);

    pages.attach({ use });

    allPageNames.forEach(name => expect(pagesAttached).to.include(name));

    sandbox.restore();
  });

  it('does not import pages that are not enabled', () => {
    const sandbox = sinon.createSandbox();
    sandbox.stub(config, 'features').value({
      missedMilestones: false
    });

    const pagesAttached = [];
    const use = r => pagesAttached.push(r.page.constructor.name);
    pages.attach({ use });

    expect(pagesAttached).to.not.include('MissedMilestones');

    sandbox.restore();
  });
});