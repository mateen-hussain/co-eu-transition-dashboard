const { expect } = require('test/unit/util/chai');
const { INTEGER, STRING } = require('sequelize');
const Role = require('models/role');

describe('models/role', () => {
  it('called Role.init with the correct parameters', () => {
    expect(Role.init).to.have.been.calledWith({
      id: {
        type: INTEGER,
        primaryKey: true
      },
      name: {
        type: STRING(45)
      }
    });
  });
});