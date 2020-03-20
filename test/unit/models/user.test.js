const User = require('models/user');
const { expect } = require('test/unit/util/chai');
const { STRING, INTEGER, DATE, ENUM } = require('sequelize');
const Department = require('models/department');
const DepartmentUser = require('models/departmentUser');

describe('models/user', () => {
  it('called User.init with the correct parameters', async () => {
    expect(User.init).to.have.been.calledWith({
      id: {
        type: INTEGER,
        primaryKey: true
      },
      email: STRING,
      hashed_passphrase: STRING(128),
      last_login_at: DATE,
      role: {
        type: ENUM('admin', 'user')
      },
      twofa_secret: STRING(128)
    });

    it('called User.belongsToMany with the correct parameters', () => {
      expect(User.belongsToMany).to.have.been.calledWith(Department, { through: DepartmentUser, foreignKey: 'user_id' });
    });

    it('called Department.belongsToMany with the correct parameters', () => {
      expect(Department.belongsToMany).to.have.been.calledWith(User, { through: DepartmentUser, foreignKey: 'department_name' });
    });

    it.skip('#getProjects');
  });
});