const { expect } = require('test/unit/util/chai');
const { INTEGER } = require('sequelize');
const UserRole = require('models/userRole');

describe('models/userRole', () => {
  it('called UserRole.init with the correct parameters', () => {
    expect(UserRole.init).to.have.been.calledWith({
      user_id: {
        type: INTEGER,
        primaryKey: true
      },
      role_id: {
        type: INTEGER
      }
    });
  });

  it('throws an error if no user found', async () => {
    UserRole.findAll.returns();
    let message = '';
    try{
      await UserRole.getUserRole();
    } catch (thrownError) {
      message = thrownError.message;
    }
    expect(message).to.eql('Unknown user');
  });
});