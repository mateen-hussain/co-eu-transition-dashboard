const { expect, sinon } = require('test/unit/util/chai');
const CategoryField = require('models/categoryField');
const EntityFieldEntry = require('models/entityFieldEntry');
const EntityFieldEntryAudit = require('models/entityFieldEntryAudit');
const { STRING, INTEGER, ENUM, BOOLEAN, TEXT } = require('sequelize');

describe('models/categoryField', () => {
  it('called CategoryField.init with the correct parameters', () => {
    expect(CategoryField.init).to.have.been.calledWith(sinon.match({
      id: {
        type: INTEGER,
        primaryKey: true
      },
      categoryId: {
        field: 'category_id',
        type: INTEGER
      },
      name: STRING(45),
      displayName: {
        field: "display_name",
        type: STRING(300),
      },
      type: ENUM("string", "boolean", "integer", "float", "group", "date"),
      isActive: {
        type: BOOLEAN,
        field: "is_active",
      },
      isRequired: {
        type: BOOLEAN,
        field: "is_required"
      },
      description: {
        field: "description",
        type: TEXT
      },
      order: {
        type: INTEGER
      }
    }));
  });

  it('called CategoryField.hasMany with the correct parameters', () => {
    expect(CategoryField.hasMany).to.have.been.calledWith(EntityFieldEntry, { foreignKey: 'categoryFieldId' });
    expect(CategoryField.hasMany).to.have.been.calledWith(EntityFieldEntryAudit, { foreignKey: 'categoryFieldId' });
  });

  it('called EntityFieldEntry.belongsTo with the correct parameters', () => {
    expect(EntityFieldEntry.belongsTo).to.have.been.calledWith(CategoryField, { foreignKey: 'categoryFieldId' });
  });

  it('called EntityFieldEntryAudit.belongsTo with the correct parameters', () => {
    expect(EntityFieldEntryAudit.belongsTo).to.have.been.calledWith(CategoryField, { foreignKey: 'categoryFieldId' });
  });
});
