const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const jwt = require('services/jwt');
const authentication = require('services/authentication');

let page = {};

describe('pages/data-entry/add-data/AddData', () => {
  beforeEach(() => {
    const AddData = require('pages/data-entry/add-data/AddData');

    const res = { cookies: sinon.stub() };

    const req = { cookies: [] };

    page = new AddData('some path', req, res);

    sinon.stub(jwt, 'restoreData');

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    jwt.restoreData.restore();
    authentication.protect.restore();
  });

  it('only admins are alowed to access this page', () => {
    expect(page.middleware).to.eql([
      ...authentication.protect(['admin'])
    ]);

    sinon.assert.calledWith(authentication.protect, ['admin']);
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.dataEntry.addData);
    });
  });
});
