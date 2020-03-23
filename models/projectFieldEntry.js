const { Model, STRING, INTEGER, BLOB, Op } = require('sequelize');
const sequelize = require('services/sequelize');
const modelUtils = require('helpers/models');
const ProjectField = require('./projectField');

class ProjectFieldEntry extends Model {
  static includes(attributeKey) {
    return attributeKey.includes('ProjectFieldEntryFilter');
  }

  static createSearch(projectField, options) {
    const filters = options.map(option => {
      return {
        [Op.and]: {
          project_field_id: projectField.id,
          value: {
            [Op.like]: `%${option}%`
          }
        }
      }
    });

    return {[Op.or]: filters};
  }

  get fields() {
    const projectField = this.get('projectField');
    return {
      id: projectField.name,
      name: projectField.displayName,
      value: this.get('value'),
      type: projectField.type
    };
  }
}

ProjectFieldEntry.init({
  projectFieldId: {
    type: INTEGER,
    field: 'project_field_id',
    primaryKey: true
  },
  projectUid: {
    type: STRING(45),
    field: 'project_uid',
    primaryKey: true
  },
  value: {
    type: BLOB,
    get() {
      if (!this.getDataValue('value')) return;
      const value = this.getDataValue('value').toString('utf8');
      return modelUtils.parseFieldEntryValue(value, this.get('projectField').get('type'))
    },
    set(value) {
      if (!this.projectField) {
        return this.setDataValue('value', value)
      }

      return this.setDataValue('value', value);
    },
    validate: {
      isValid(val) {
        return modelUtils.validateFieldEntryValue.call(this, val);
      }
    }
  }
}, { sequelize, modelName: 'projectFieldEntry', tableName: 'project_field_entry', createdAt: 'created_at', updatedAt: 'updated_at' });

// ProjectFieldEntry.hasMany(ProjectFieldEntry, { as: 'project_field_entry_count', foreignKey: 'id' });
ProjectFieldEntry.belongsTo(ProjectField, { foreignKey: 'projectFieldId' });
ProjectField.hasMany(ProjectFieldEntry, { foreignKey: 'projectFieldId' });

module.exports = ProjectFieldEntry;
