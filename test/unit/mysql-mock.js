const mock = require('mock-require');
const { sinon } = require('test/unit/util/chai');
const { Sequelize } = require('sequelize-test-helpers');
const { STRING, DATE, ENUM, Op, literal } = require('sequelize');

class Model {}

let s = {};

// beforeEach(() => {
  Model.init = sinon.stub();
  Model.hasMany = sinon.stub();
  Model.belongsTo = sinon.stub();
  Model.belongsToMany = sinon.stub();
  Model.findOne = sinon.stub().resolves({});
  Model.findAll = sinon.stub().resolves([]);
  Model.rawAttributes = {};

  s = sinon.stub().returns(Sequelize);

  s.STRING = STRING;
  s.ENUM = ENUM;
  s.Model = Model;
  s.DATE = DATE;
  s.Op = Op;
  s.literal = literal;
// });

mock('sequelize', s);

