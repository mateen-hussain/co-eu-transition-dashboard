const User = require('models/user');
const { expect } = require('test/unit/util/chai');
const { STRING, DATE, ENUM } = require('sequelize');
const Department = require('models/department');
const DepartmentUser = require('models/departmentUser');

describe('models/user', () => {
  it('called User.init with the correct parameters', async () => {
    expect(User.init).to.have.been.calledWith({
      id: {
        type: undefined,
        primaryKey: true
      },
      email: STRING(64),
      hashedPassphrase: {
        type: STRING(128),
        field: "hashed_passphrase"
      },
      lastLoginAt: {
        type: DATE,
        field: "last_login_at"
      },
      role: {
        type: ENUM('admin', 'user')
      },
      twofaSecret: {
        type: STRING(128),
        field: "twofa_secret"
      }
    });

    it('called User.belongsToMany with the correct parameters', () => {
      expect(User.belongsToMany).to.have.been.calledWith(Department, { through: DepartmentUser, foreignKey: 'userId' });
    });

    it('called Department.belongsToMany with the correct parameters', () => {
      expect(Department.belongsToMany).to.have.been.calledWith(User, { through: DepartmentUser, foreignKey: 'departmentName' });
    });

    it.skip('#getProjects');
  });
});
