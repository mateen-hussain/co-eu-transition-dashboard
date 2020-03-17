const { expect } = require('test/unit/util/chai');
const { STRING, INTEGER } = require('sequelize');
const DepartmentUser = require('models/departmentUser');

describe('models/departmentUser', () => {
  it('called DepartmentUser.init with the correct parameters', () => {
    expect(DepartmentUser.init).to.have.been.calledWith({
      department_name: {
        type: STRING(10),
        primaryKey: true
      },
      user_id: INTEGER
    });
  });
});