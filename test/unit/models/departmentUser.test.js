const { expect } = require('test/unit/util/chai');
const { STRING, INTEGER } = require('sequelize');
const DepartmentUser = require('models/departmentUser');

describe('models/departmentUser', () => {
  it('called DepartmentUser.init with the correct parameters', () => {
    expect(DepartmentUser.init).to.have.been.calledWith({
      departmentName: {
        type: STRING(10),
        field: 'department_name',
        primaryKey: true
      },
      userId: {
        type: INTEGER,
        field: 'user_id',
        primaryKey: true
      }
    });
  });
});
