const { expect } = require('test/unit/util/chai');
const { STRING } = require('sequelize');
const Department = require('models/department');
const Project = require('models/project');

describe('models/department', () => {
  it('called Department.init with the correct parameters', () => {
    expect(Department.init).to.have.been.calledWith({
      name: {
        type: STRING(10),
        primaryKey: true
      }
    });
  });

  it('called Department.hasMany with the correct parameters', () => {
    expect(Department.hasMany).to.have.been.calledWith(Project, { foreignKey: 'department_name' });
  });

  it('called Department.hasMany with the correct parameters', () => {
    expect(Project.belongsTo).to.have.been.calledWith(Department, { foreignKey: 'department_name' });
  });
});