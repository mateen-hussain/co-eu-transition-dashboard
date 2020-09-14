const { expect } = require('test/unit/util/chai');
const EntityFieldEntryAudit = require('models/entityFieldEntryAudit');
const { INTEGER, TEXT, DATE, NOW } = require('sequelize');

describe('models/categoryParent', () => {
  it('called CategoryParent.init with the correct parameters', () => {
    expect(EntityFieldEntryAudit.init).to.have.been.calledWith({
      entityId: {
        type: INTEGER,
        field: 'entity_id'
      },
      categoryFieldId: {
        type: INTEGER,
        field: 'category_field_id'
      },
      value: {
        type: TEXT
      },
      archivedAt: {
        type: DATE,
        field: 'archived_at',
        defaultValue: NOW
      }
    });
  });
});
