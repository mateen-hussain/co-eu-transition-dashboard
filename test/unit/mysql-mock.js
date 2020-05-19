const mock = require('mock-require');
const { sinon } = require('test/unit/util/chai');
const { Sequelize } = require('sequelize-test-helpers');
const { STRING, DATE, ENUM, Op, literal } = require('sequelize');

class Model {}

let s = {};

Model.init = sinon.stub().callsFake(function(attributes) {
  this.get = sinon.stub();
  this.hasMany = sinon.stub();
  this.belongsTo = sinon.stub();
  this.belongsToMany = sinon.stub();
  this.findOne = sinon.stub().resolves({});
  this.upsert = sinon.stub().resolves();
  this.create = sinon.stub().resolves();
  this.destroy = sinon.stub().resolves();
  this.findAll = sinon.stub().resolves([]);
  this.count = sinon.stub().resolves(0);
  this.rawAttributes = attributes;
  this.getQueryInterface = sinon.stub();
  this.query = sinon.stub();
});
Sequelize.getQueryInterface = sinon.stub();
Sequelize.query = sinon.stub();
Sequelize.fn = sinon.stub();

const transaction = {
  rollback: sinon.stub(),
  commit: sinon.stub()
};
Sequelize.query = sinon.stub();
Sequelize.transaction = sinon.stub().returns(transaction);
Sequelize.transaction.rollback = transaction.rollback;
Sequelize.transaction.commit = transaction.commit;

s = sinon.stub().returns(Sequelize);

s.STRING = STRING;
s.ENUM = ENUM;
s.Model = Model;
s.DATE = DATE;
s.Op = Op;
s.literal = literal;

mock('sequelize', s);

const umzug = sinon.stub().returns({
  up: sinon.stub()
});
mock('umzug', umzug);

