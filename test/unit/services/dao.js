const DAO = require('services/dao');
const { expect } = require('test/unit/util/chai');
const sequelize = require('services/sequelize');

describe('services/dao', () => {
  describe('quoteIdentifier', () => {
    it('should quote table and field', () => {
      const dao = new DAO({ sequelize: sequelize });
      expect(dao.quoteIdentifier("Hello->World.Foo")).to.eql("`Hello->World.Foo`");
    });
  });

});
