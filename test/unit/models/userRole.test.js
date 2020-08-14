const { expect } = require('test/unit/util/chai');
const { INTEGER } = require('sequelize');
const UserRole = require('models/userRole');

describe('models/userRole', () => {
  it('called UserRole.init with the correct parameters', () => {
    expect(UserRole.init).to.have.been.calledWith({
      userId: {
        type: INTEGER,
        primaryKey: true,
        field: 'user_id'
      },
      roleId: {
        type: INTEGER,
        primaryKey: true,
        field: 'role_id'
      }
    });
  });
});