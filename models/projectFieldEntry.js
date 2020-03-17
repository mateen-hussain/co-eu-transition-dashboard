const { Model, STRING, INTEGER, BLOB, literal } = require('sequelize');
const sequelize = require('services/sequelize');
const modelUtils = require('helpers/models');
const ProjectField = require('./projectField');

class ProjectFieldEntry extends Model {
  static includes(attributeKey) {
    return attributeKey.includes('ProjectFieldEntryFilter');
  }

  static createSearch(attributeKey, options, override) {
    const filter = Object.assign(JSON.parse(attributeKey), override);

    const likeString = [];
    for(const option of options) {
      likeString.push(`\`${filter.path}\`.\`value\` LIKE "%${option}%"`)
    }

    return literal(`\`${filter.path}\`.\`project_field_id\`=${filter.id} AND ${likeString.join(' OR ')}`);
  }

  get fields() {
    const projectField = this.get('projectField');
    return {
      id: JSON.stringify({
        path: 'projects->ProjectFieldEntryFilter',
        id: this.get('id')
      }),
      name: projectField.name,
      value: modelUtils.parseFieldEntryValue(this.get('value'), projectField.get('type'))
    };
  }
}

ProjectFieldEntry.init({
  id: {
    type: INTEGER,
    primaryKey: true
  },
  project_field_id: {
    type: INTEGER
  },
  project_uid: {
    type: STRING(45),
  },
  value: {
    type: BLOB,
    get() {
      let value = this.getDataValue('value').toString('utf8');
      return modelUtils.parseFieldEntryValue(value, this.projectField.get('type'))
    }
  }
}, { sequelize, modelName: 'projectFieldEntry', tableName: 'project_field_entry', createdAt: 'created_at', updatedAt: 'updated_at' });

ProjectFieldEntry.hasMany(ProjectFieldEntry, { as: 'project_field_entry_count', foreignKey: 'id' });
ProjectFieldEntry.belongsTo(ProjectField, { foreignKey: 'project_field_id' });
ProjectField.hasMany(ProjectFieldEntry, { foreignKey: 'project_field_id' });

module.exports = ProjectFieldEntry;