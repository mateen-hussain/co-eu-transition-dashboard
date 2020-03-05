const mock = require('mock-require');
const { sinon } = require('test/unit/util/chai');
const { Sequelize } = require('sequelize-test-helpers');
const { STRING, DATE, ENUM, Op, literal } = require('sequelize');

class Model {}
Model.init = sinon.stub();
Model.hasMany = sinon.stub();
Model.findAll = sinon.stub();
Model.rawAttributes = {};

const s = sinon.stub().returns(Sequelize);

s.STRING = STRING;
s.ENUM = ENUM;
s.Model = Model;
s.DATE = DATE;
s.Op = Op;
s.literal = literal;

mock('sequelize', s);