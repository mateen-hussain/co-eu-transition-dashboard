const Page = require('core/pages/page');
const jwt = require('services/jwt');
const { expect, sinon } = require('test/unit/util/chai');

let page = {};
const sampleData = {some: 'data'};

describe('core/pages/page', () => {
  before(() => {
    sinon.stub(jwt, 'restoreData').returns(sampleData);
    sinon.stub(jwt, 'saveData');
    page = new Page('some/path');
  });

  after(() => {
    jwt.restoreData.restore();
    jwt.saveData.restore();
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

  it('#getRequest', () => {
    const res = {
      locals: {},
      render: sinon.stub()
    };
    page.getRequest({}, res);

    expect(jwt.restoreData.calledOnce).to.eql(true);

    sinon.assert.calledWith(res.render, page.template);
  });

  it('#postRequest', async () => {
    const res = { redirect: sinon.stub() };

    await page.postRequest({}, res);

    expect(jwt.saveData.calledOnce).to.eql(true);
    sinon.assert.calledWith(res.redirect, page.url);
  });

  describe('#handler', async () => {
    beforeEach(() => {
      sinon.stub(page, 'getRequest');
      sinon.stub(page, 'postRequest');
    });

    afterEach(() => {
      page.getRequest.restore();
      page.postRequest.restore();
    });

    it('handles get request', () => {
      const req = { method: 'GET' };
      page.handler(req);
      expect(page.getRequest.calledOnce).to.eql(true);
      expect(page.postRequest.calledOnce).to.eql(false);
    });

    it('handles post request', () => {
      const req = { method: 'POST' };
      page.handler(req);
      expect(page.getRequest.calledOnce).to.eql(false);
      expect(page.postRequest.calledOnce).to.eql(true);
    });
  });

  it('#locals', () => {
    const locals = [
      'toLocaleString',
      'url',
      'template',
      'getRequest',
      'postRequest',
      'router',
      'path'
    ];

    locals.forEach(key => {
      expect(Object.keys(page.locals)).to.include(key);
    })

  });
});



