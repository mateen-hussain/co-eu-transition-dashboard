const mock = require('mock-require');
const { sinon } = require('test/unit/util/chai');
const { Sequelize } = require('sequelize-test-helpers');
const { STRING, DATE, ENUM, Op, literal } = require('sequelize');

class Model {}

let s = {};

Model.init = sinon.stub().callsFake(function() {
  this.hasMany = sinon.stub();
  this.belongsTo = sinon.stub();
  this.belongsToMany = sinon.stub();
  this.findOne = sinon.stub().resolves({});
  this.findAll = sinon.stub().resolves([]);
  this.rawAttributes = {};
  this.getQueryInterface = sinon.stub();
});
Sequelize.getQueryInterface = sinon.stub();

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

