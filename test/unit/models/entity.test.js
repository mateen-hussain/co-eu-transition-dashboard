const { expect } = require('test/unit/util/chai');
const Entity = require('models/entity');
const EntityParent = require('models/entityParent');
const EntityFieldEntry = require('models/entityFieldEntry');
const EntityFieldEntryAudit = require('models/entityFieldEntryAudit');
const { STRING, INTEGER } = require('sequelize');

describe('models/entity', () => {
  it('called Entity.init with the correct parameters', () => {
    expect(Entity.init).to.have.been.calledWith({
      id: {
        type: INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      publicId: {
        type: STRING(64),
        allowNull: true,
        field: "public_id"
      },
      categoryId: {
        type: INTEGER,
        allowNull: false,
        field: "category_id"
      }
    });
  });

  it('called Entity.belongsToMany with the correct parameters', () => {
    expect(Entity.belongsToMany).to.have.been.calledWith(Entity, { through: EntityParent, foreignKey: 'parentEntityId', as: 'children', otherKey: 'entityId' });
  });

  it('called Entity.hasMany with the correct parameters', () => {
    expect(Entity.hasMany).to.have.been.calledWith(EntityFieldEntry, { foreignKey: 'entityId' });
    expect(Entity.hasMany).to.have.been.calledWith(EntityFieldEntryAudit, { foreignKey: 'entityId' });
  });

  it('called EntityFieldEntry.belongsTo with the correct parameters', () => {
    expect(EntityFieldEntry.belongsTo).to.have.been.calledWith(Entity, { foreignKey: 'entityId' });
  });

  it('called EntityFieldEntryAudit.belongsTo with the correct parameters', () => {
    expect(EntityFieldEntryAudit.belongsTo).to.have.been.calledWith(Entity, { foreignKey: 'entityId' });
  });
});
