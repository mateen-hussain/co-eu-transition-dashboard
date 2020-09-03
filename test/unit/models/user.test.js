const User = require('models/user');
const { expect } = require('test/unit/util/chai');
const { STRING, DATE, ENUM, INTEGER, BOOLEAN } = require('sequelize');
const Department = require('models/department');
const DepartmentUser = require('models/departmentUser');
const Role = require('models/role');
const UserRole = require('models/userRole');
const Entity = require('models/entity');
const EntityUser = require('models/entityUser');

describe('models/user', () => {
  it('called User.init with the correct parameters', async () => {
    expect(User.init).to.have.been.calledWith({
      id: {
        type: undefined,
        primaryKey: true,
        autoIncrement: true
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
        type: ENUM('uploader', 'viewer', 'administrator')
      },
      twofaSecret: {
        type: STRING(128),
        field: "twofa_secret"
      },
      loginAttempts: {
        type: INTEGER,
        field: "login_attempts"
      },
      mustChangePassword: {
        type: BOOLEAN,
        field: "must_change_password"
      }
    });
  });

  it('called User.belongsToMany with the correct parameters', () => {
    expect(User.belongsToMany).to.have.been.calledWith(Department, { through: DepartmentUser, foreignKey: 'userId' });
  });

  it('called Department.belongsToMany with the correct parameters', () => {
    expect(Department.belongsToMany).to.have.been.calledWith(User, { through: DepartmentUser, foreignKey: 'departmentName' });
  });

  it('called User.belongsToMany with the correct parameters', () => {
    expect(User.belongsToMany).to.have.been.calledWith(Role, { through: UserRole, foreignKey: 'userId' });
    expect(User.belongsToMany).to.have.been.calledWith(Entity, { through: EntityUser, foreignKey: 'userId' });
  });

  it('called Entity.belongsToMany with the correct parameters', () => {
    expect(Entity.belongsToMany).to.have.been.calledWith(User, { through: EntityUser, foreignKey: 'entityId' });
  });

  describe('#hasViewAllPermissions', () => {
    it('returns true if user can view more than one department', () => {
      const user = new User();
      user.departments = [{}, {}];
      expect(user.hasViewAllPermissions).to.be.ok;
    });

    it('returns false if user can only view one department', () => {
      const user = new User();
      user.departments = [{}];
      expect(user.hasViewAllPermissions).to.not.be.ok;
    })
  });
});
