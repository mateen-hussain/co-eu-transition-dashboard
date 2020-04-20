const jsonwebtoken = require('jsonwebtoken');
const jwt = require('services/jwt');
const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');

describe('services/jwt', () => {
  beforeEach(() => {
    sinon.stub(jsonwebtoken, 'sign').returns('some token');
    sinon.stub(jsonwebtoken, 'verify').returns('some token');
  });

  afterEach(() => {
    jsonwebtoken.sign.restore();
    jsonwebtoken.verify.restore();
  });

  describe('#saveData', () => {
    it('stores data in a cookie', () => {
      const token = 'some token';
      jsonwebtoken.sign.returns(token);

      const res = { cookie: sinon.stub() };
      const req = { cookies: [] };
      const sampleData = { somedata: 'somedata' };

      jwt.saveData(req, res, sampleData);

      sinon.assert.calledWith(jsonwebtoken.sign, sampleData, config.cookie.secret);
      sinon.assert.calledWith(res.cookie, 'jwt', token);
    });
  });

  describe('#restoreData', () => {
    it('restores data in from cookie', () => {
      const sampleData = { somedata: 'somedata' };
      jsonwebtoken.verify.returns(sampleData);

      const req = { cookies: { 'jwt': sampleData } };

      const returnedData = jwt.restoreData(req);

      expect(returnedData).to.eql(sampleData)
    });

    it('clears jwt cookie if error with parsing', () => {
      jsonwebtoken.verify.throws('bad jwt');

      const req = { cookies: { 'jwt': {} } };
      const res = { clearCookie: sinon.stub() };

      const returnedData = jwt.restoreData(req, res);

      sinon.assert.calledWith(res.clearCookie, 'jwt');
      expect(returnedData).to.eql({});
    });
  });

  describe('#token', () => {
    it('returns token from cookie', () => {
      const req = { cookies: { jwt: 'some token' } };
      const token = jwt.token(req);
      expect(token).to.eql(req.cookies.jwt)
    });

    it('returns undefined if no token found', () => {
      const req = { cookies: {} };
      const token = jwt.token(req);
      expect(token).to.be.undefined;
    });
  });
});
