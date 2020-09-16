const { expect } = require('test/unit/util/chai');
const EntityUser = require('models/entityUser');
const { INTEGER } = require('sequelize');

describe('models/entityUser', () => {
  it('called CntityUser.init with the correct parameters', () => {
    expect(EntityUser.init).to.have.been.calledWith({
      entityId: {
        type: INTEGER,
        field: "entity_id",
        primaryKey: true
      },
      userId: {
        type: INTEGER,
        field: "user_id",
        primaryKey: true
      }
    });
  });
});
