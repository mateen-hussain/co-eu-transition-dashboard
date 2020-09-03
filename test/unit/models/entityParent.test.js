const { expect } = require('test/unit/util/chai');
const EntityFieldEntryAudit = require('models/entityFieldEntryAudit');
const { INTEGER } = require('sequelize');

describe('models/categoryParent', () => {
  it('called CategoryParent.init with the correct parameters', () => {
    expect(EntityFieldEntryAudit.init).to.have.been.calledWith({
      entityId: {
        type: INTEGER,
        field: "entity_id",
        primaryKey: true
      },
      parentEntityId: {
        type: INTEGER,
        field: "parent_entity_id",
        primaryKey: true
      }
    });
  });
});
