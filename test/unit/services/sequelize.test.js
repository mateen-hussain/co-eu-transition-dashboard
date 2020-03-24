const { sinon } = require('test/unit/util/chai');
const Sequelize = require('sequelize');
const { services } = require('config');

describe('services/sequelize', () => {
  before(() => {
    require('services/sequelize');
  });

  it('should create a Sequelize instance', () => {
    sinon.assert.calledWith(Sequelize, services.mysql.uri, {
      dialect: 'mysql',
      dialectOptions: {
        ssl: null
      },
      logging: false
    });
  });
});
