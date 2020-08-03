const { Model, STRING, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');
const EntityParent = require('./entityParent');
const EntityFieldEntry = require('./entityFieldEntry');
const EntityFieldEntryAudit = require('./entityFieldEntryAudit');
const pick = require('lodash/pick');

class Entity extends Model {
  static async import(entity, category, entityFields, options) {
    const attributes = Object.keys(entity);

    const entityAttributes = attributes.filter(attribute => this.rawAttributes[attribute]);
    const entityToUpsert = pick(entity, entityAttributes);

    entityToUpsert.categoryId = category.id;

    // if public id then assign actual id to entity
    if(entity.publicId) {
      const entityModel = await this.findOne({
        where: {
          publicId: entityToUpsert.publicId
        }
      }, options);

      if(entityModel) {
        entity.id = entityModel.id;
      }
    }

    // if no id then its a new entity
    if(!entity.id) {
      const entityModel = await this.create(entityToUpsert, options);
      entity.id = entityModel.id;
    }

    // if a parent public id is set create that relationship
    if(entity.parentPublicId) {
      const parent = await this.findOne({
        where: {
          publicId: entity.parentPublicId
        }
      });

      // currently no way to support multiple parents through excel import to remove previous parent
      if (parent) {
        await EntityParent.destroy({
          where: {
            entityId: entity.id
          }
        }, options);

        await EntityParent.create({
          entityId: entity.id,
          parentEntityId: parent.id
        }, options);
      } else {
        // this should not happen as its validated in a previous step.
        throw new Error(`Parent ${entity.parentPublicId} was not found in the database`);
      }
    }

    await this.importFieldEntries(entity, entityFields, options);
  }

  static async importFieldEntries(entity, entityFields, options) {
    const attributes = Object.keys(entity);

    const entityFieldEntryAttributes = attributes.filter(attribute => !this.rawAttributes[attribute] && attribute != 'parentPublicId');

    const entityFieldEntries = entityFieldEntryAttributes.map(entityFieldEntryAttribute => {
      const entityField = entityFields.find(entityField => entityField.name === entityFieldEntryAttribute)
      return {
        entityId: entity.id,
        categoryFieldId: entityField.id,
        value: entity[entityField.name]
      };
    });

    for (const entityFieldEntry of entityFieldEntries) {
      await EntityFieldEntry.import(entityFieldEntry, options);
    }
  }
}

Entity.init({
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
}, { sequelize, modelName: 'entity', tableName: 'entity', createdAt: 'created_at', updatedAt: false });

Entity.belongsToMany(Entity, { through: EntityParent, foreignKey: 'parentEntityId', as: 'children', otherKey: 'entityId' });

Entity.hasMany(EntityFieldEntry, { foreignKey: 'entityId' });
EntityFieldEntry.belongsTo(Entity, { foreignKey: 'entityId' });

Entity.hasMany(EntityFieldEntryAudit, { foreignKey: 'entityId' });
EntityFieldEntryAudit.belongsTo(Entity, { foreignKey: 'entityId' });

module.exports = Entity;
