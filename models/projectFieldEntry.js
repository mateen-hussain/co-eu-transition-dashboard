const { Model, STRING, INTEGER, TEXT, Op } = require('sequelize');
const sequelize = require('services/sequelize');
const modelUtils = require('helpers/models');
const ProjectField = require('./projectField');
const ProjectFieldEntryAudit = require('./projectFieldEntryAudit');

class ProjectFieldEntry extends Model {
  static async import(projectFieldEntry, options) {
    if (!projectFieldEntry.value) {
      return
    }

    const existingField = await ProjectFieldEntry.findOne({
      where: {
        projectUid: projectFieldEntry.projectUid,
        fieldId: projectFieldEntry.fieldId
      }
    });

    if (existingField) {
      await ProjectFieldEntryAudit.create(existingField.toJSON(), options);
    }

    await this.upsert(projectFieldEntry, options);
  }

  static createSearch(projectField, options) {
    const filters = options.map(option => {
      return {
        [Op.and]: {
          project_field_id: projectField.id,
          value: option
        }
      }
    });

    return { [Op.or]: filters };
  }

  get fields() {
    const projectField = this.get('projectField');
    return new Map().set(projectField.name, {
      id: projectField.name,
      name: projectField.displayName,
      value: this.get('value'),
      type: projectField.type
    });
  }
}

ProjectFieldEntry.init({
  fieldId: {
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
    type: TEXT,
    get() {
      if (!this.getDataValue('value')) return;
      const value = this.getDataValue('value').toString('utf8');
      if (this.get('projectField')) {
        return modelUtils.parseFieldEntryValue(value, this.get('projectField').get('type'))
      } else {
        return value;
      }
    }
  }
}, { sequelize, modelName: 'projectFieldEntry', tableName: 'project_field_entry', createdAt: 'created_at', updatedAt: 'updated_at' });

ProjectFieldEntry.belongsTo(ProjectField, { foreignKey: 'fieldId' });
ProjectField.hasMany(ProjectFieldEntry, { foreignKey: 'fieldId' });

module.exports = ProjectFieldEntry;
