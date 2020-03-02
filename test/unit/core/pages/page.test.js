const Page = require('core/pages/page');
const { expect } = require('test/unit/util/chai');

let page = {};
describe('core/pages/page', () => {
  before(() => {
    page = new Page('some/path');
  });

  it('#router', () => {
    expect(page.router.constructor.name).to.eql('Function');
  });

  it('#url', () => {
    expect(page.url).to.eql('/');
  });

  it('#middleware', () => {
    expect(page.middleware).to.eql([]);
  });

  it('#template', () => {
    expect(page.template).to.eql('some/path/Page.html');
  });

  it.skip('#getRequest', () => {
    expect(page.locals).to.eql('test');
  });

  it.skip('#postRequest', () => {
    expect(page.postRequest).to.eql('test');
  });

  it.skip('#handler', () => {
    expect(page.handler).to.eql('test');
  });

  it.skip('#locals', () => {
    expect(page.locals).to.eql('test');
  });
});



