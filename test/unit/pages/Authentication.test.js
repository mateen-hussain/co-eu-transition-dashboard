const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const Authentication = require('pages/authentication/Authentication');
const authenticationService = require('services/authentication');

let page = {};
let req = {};
let res = {};

describe('pages/authentication/Authentication', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub() };
    req = { cookies: [] };

    page = new Authentication('some path', req, res);

    sinon.stub(authenticationService, 'login').resolves();
  });

  afterEach(() => {
    authenticationService.login.restore();
  });

  it('returns correct url', () => {
    expect(page.url).to.eql(paths.authentication);
  });

  it('does not require authentication', () => {
    expect(page.requireAuth).to.not.be.ok;
  });

  it('calls authentication.login on post request', async () => {
    await page.postRequest(req, res);
    sinon.assert.calledWith(authenticationService.login, req, res);
  });
});
