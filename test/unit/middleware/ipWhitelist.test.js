const { sinon, expect } = require('test/unit/util/chai');
const config = require('config');
const ipWhitelist = require('middleware/ipWhitelist');

describe('middleware/ipWhitelist', () => {
  describe('#tableauIpWhiteList', () => {
    it('adds tableauIpWhiteList to locals on IP match', () => {
      config.services.tableau.whiteListedIpRange = ['192.168.1.1'];
      const req = { ip: '192.168.1.1' };
      const res = { locals: {} };
      const next = sinon.stub();

      ipWhitelist.tableauIpWhiteList(req, res, next)

      expect(res.locals.tableauIpWhiteList).to.eql(true);
      sinon.assert.calledOnce(next);
    });

    it('doesnt add tableauIpWhiteList to locals on IP mismatch', () => {
      config.services.tableau.whiteListedIpRange = ['192.168.1.100'];
      const req = { ip: '192.168.1.1' };
      const res = { locals: {} };
      const next = sinon.stub();

      ipWhitelist.tableauIpWhiteList(req, res, next)

      expect(res.locals.tableauIpWhiteList).to.be.undefined;
      sinon.assert.calledOnce(next);
    });
  });

  describe('#ipWhiteList', () => {
    it('adds ipWhiteList to locals on IP match', () => {
      config.ipWhiteList = ['192.168.1.1'];
      const req = { ip: '192.168.1.1' };
      const res = { locals: {} };
      const next = sinon.stub();

      ipWhitelist.ipWhiteList(req, res, next)

      expect(res.locals.ipWhiteList).to.eql(true);
      sinon.assert.calledOnce(next);
    });

    it('doesnt add ipWhiteList to locals on IP mismatch', () => {
      config.ipWhiteList = ['192.168.1.100'];
      const req = { ip: '192.168.1.1' };
      const res = { locals: {} };
      const next = sinon.stub();

      ipWhitelist.ipWhiteList(req, res, next)

      expect(res.locals.ipWhiteList).to.be.undefined;
      sinon.assert.calledOnce(next);
    });
  });
});
