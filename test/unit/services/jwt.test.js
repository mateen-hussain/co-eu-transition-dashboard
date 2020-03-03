const jsonwebtoken = require('jsonwebtoken');
const jwt = require('services/jwt');
const { expect, sinon } = require('test/unit/util/chai');
const config = require('config');

describe('services/jwt', () => {
  describe('#saveData', () => {
    it('stores data in a cookie', () => {
      const res = {
        cookie: sinon.stub()
      };
      const req = { cookies: [] };
      const sampleData = { somedata: 'somedata' };
      const shouldBeToken = jsonwebtoken.sign(JSON.stringify(sampleData), config.cookie.secret);

      jwt.saveData(req, res, sampleData);

      sinon.assert.calledWith(res.cookie, 'jwt', shouldBeToken);
    });
  });

  describe('#restoreData', () => {
    it('restores data in from cookie', () => {
      const sampleData = { somedata: 'somedata' };
      const token = jsonwebtoken.sign(JSON.stringify(sampleData), config.cookie.secret);

      const req = {
        cookies: {
          'jwt': token
        }
      };

      const returnedData = jwt.restoreData(req);

      expect(returnedData).to.eql(sampleData)
    });
  });
});
