const { sinon } = require('test/unit/util/chai');
const EntityFieldEntry = require('models/entityFieldEntry');
const { INTEGER, TEXT } = require('sequelize');

describe('models/entityFieldEntry', () => {
  it('called EntityFieldEntry.init with the correct parameters', () => {
    sinon.assert.calledWith(EntityFieldEntry.init,
      sinon.match({
        entityId: {
          type: INTEGER,
          primaryKey: true,
          field: 'entity_id'
        },
        categoryFieldId: {
          type: INTEGER,
          primaryKey: true,
          field: "category_field_id"
        },
        value: {
          type: TEXT
        }
      })
    );
  });
});
