const { sinon } = require('test/unit/util/chai');
const Sequelize = require('sequelize');
const { services } = require('config');

describe('services/sequelize', () => {
  before(() => {
    require('services/sequelize');
  });

  it('should create a Sequelize instance', () => {
    sinon.assert.calledWith(Sequelize, services.mysql.database, services.mysql.user, services.mysql.password, {
      host: services.mysql.host,
      dialect: 'mysql',
      logging: false
    });
  });
});