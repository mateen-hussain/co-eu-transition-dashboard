const sequelize = require('services/sequelize');
const Project = require('models/project');
const ProjectField = require('models/projectField');
const ProjectFieldEntry = require('models/projectFieldEntry');
const Milestone = require('models/milestone');
const MilestoneField = require('models/milestoneField');
const MilestoneFieldEntry = require('models/milestoneFieldEntry');


class DAO {
  sequelize;
  projectFields;
  milestoneFields;

  constructor(options = {}) {
    if (options.sequelize) {
      this.sequelize = options.sequelize;
    } else {
      this.sequelize = sequelize;
    }
  }

  async getProjectFieldMap() {
    if (this.projectFields) {
      return this.projectFields;
    }
    this.projectFields = await ProjectField.findAll();
    return this.projectFields;
  }

  async getMilestoneFieldMap() {
    if (this.milestoneFields) {
      return this.milestoneFields;
    }
    this.milestoneFields = await MilestoneField.findAll();
    return this.milestoneFields;
  }

  getFieldId(fieldMap,filter) {
    if (filter.id) {
      return filter.id;
    } else if (filter.name) {
      const field = fieldMap[filter.name];
      if (field) {
        return field.id;
      }
    }
    throw(`Could not find field ${JSON.stringify(filter)}`);
  }

  async getProjectFieldId(filter) {
    return this.getFieldId(await this.getProjectFieldMap(),filter);
  }

  async getMilestoneFieldId(filter) {
    return this.getFieldId(await this.getMilestoneFieldMap(),filter);
  }

  quoteIdentifier(value) {
    return this.sequelize.getQueryInterface().QueryGenerator.quoteIdentifier(value);
  }

  generateMatch(table,field,value) {
    return this.sequelize.getQueryInterface().QueryGenerator.getWhereConditions({
      [field]: value
    },table);
  }

  generateFilterAlias(type,field) {
    return `${type}_field_id_${field}`
  }

  generateProjectProjectFieldFilter(field,value) {
    const aliasName = this.generateFilterAlias("project",field);
    return `
      INNER JOIN project_field_entry AS ${aliasName} ON (
        project.uid = ${this.quoteIdentifier(aliasName)}.project_uid
        AND ${this.generateMatch(aliasName,"project_field_id",field)}
        AND ${this.generateMatch(aliasName,"value",value)}
      )
    `;
  }

  generateProjectMilestoneFieldFilter(field,value) {
    const aliasName = this.generateFilterAlias("milestone",field);
    return `
      JOIN (
          SELECT project.uid
          FROM
              project INNER JOIN milestone ON (project.uid = milestone.project_uid)
              INNER JOIN milestone_field_entry ON (
                milestone.uid = milestone_field_entry.milestone_uid
                AND ${this.generateMatch("milestone_field_entry","milestone_field_id",field)}
              )
          WHERE
              milestone.project_uid = project.uid
              AND ${this.generateMatch("milestone_field_entry","value",value)}
          GROUP BY
              project.uid
      ) AS ${this.quoteIdentifier(aliasName)} ON (${this.quoteIdentifier(aliasName)}.uid = project.uid)
    `;
  }

  async generateProjectQuery(userId, projectFilters = [],milestoneFilters = []) {
    let query = `
      SELECT
        project.uid, project.department_name, project.title, project.impact, project.is_completed,
        project.sro, project.description, project.created_at, project.updated_at,

        \`projectFieldEntries\`.project_field_id AS \`projectFieldEntries.projectFieldId\`,
        \`projectFieldEntries\`.project_uid AS \`projectFieldEntries.projectUid\`,
        \`projectFieldEntries\`.created_at AS \`projectFieldEntries.created_at\`,
        \`projectFieldEntries\`.updated_at AS \`projectFieldEntries.updated_at\`,
        \`projectFieldEntries\`.value AS \`projectFieldEntries.value\`,

        \`projectFieldEntries->projectField\`.id AS \`projectFieldEntries.projectField.id\`,
        \`projectFieldEntries->projectField\`.name AS \`projectFieldEntries.projectField.name\`,
        \`projectFieldEntries->projectField\`.display_name AS \`projectFieldEntries.projectField.displayName\`,
        \`projectFieldEntries->projectField\`.type AS \`projectFieldEntries.projectField.type\`,
        \`projectFieldEntries->projectField\`.config AS \`projectFieldEntries.projectField.config\`,
        \`projectFieldEntries->projectField\`.is_active AS \`projectFieldEntries.projectField.isActive\`,
        \`projectFieldEntries->projectField\`.is_required AS \`projectFieldEntries.projectField.isRequired\`,
        \`projectFieldEntries->projectField\`.import_column_name AS \`projectFieldEntries.projectField.importColumnName\`,
        \`projectFieldEntries->projectField\`.group AS \`projectFieldEntries.projectField.group\`,
        \`projectFieldEntries->projectField\`.order AS \`projectFieldEntries.projectField.order\`,
        \`projectFieldEntries->projectField\`.description AS \`projectFieldEntries.projectField.description\`

      FROM
        user INNER JOIN department_user ON (user.id = department_user.user_id)
        INNER JOIN project ON (department_user.department_name = project.department_name)
        LEFT OUTER JOIN project_field_entry AS \`projectFieldEntries\` ON (project.uid = \`projectFieldEntries\`.project_uid)
        LEFT OUTER JOIN project_field AS \`projectFieldEntries->projectField\` ON (\`projectFieldEntries->projectField\`.id = \`projectFieldEntries\`.project_field_id)
    `;

    projectFilters.forEach( async(filter) => {
      const fieldId = await this.getProjectFieldId(filter);
      query += this.generateProjectProjectFieldFilter(fieldId,filter.value);
    });

    milestoneFilters.forEach( async(filter) => {
      const fieldId = await this.getMilestoneFieldId(filter);
      query += this.generateProjectMilestoneFieldFilter(fieldId,filter.value);
    });

    query += `
      WHERE
        ${this.generateMatch("user","id",userId)}
    `;


    return [query,{}];
  }

  generateMilestoneMilestoneFieldFilter(field,value) {
    const aliasName = this.generateFilterAlias("milestone",field);
    return `
      INNER JOIN milestone_field_entry AS ${aliasName} ON (
        milestones.uid = ${this.quoteIdentifier(aliasName)}.milestone_uid
        AND ${this.generateMatch(aliasName,"milestone_field_id",field)}
        AND ${this.generateMatch(aliasName,"value",value)}
      )
    `;
  }

  generateMilestoneProjectFieldFilter(field,value) {
    const aliasName = this.generateFilterAlias("project",field);
    return `
      JOIN (
          SELECT project.uid
          FROM
              project INNER JOIN project_field_entry ON (
                project.uid = project_field_entry.project_uid
                AND ${this.generateMatch("project_field_entry","project_field_id",field)}
              )
          WHERE
              ${this.generateMatch("project_field_entry","value",value)}
          GROUP BY
              project.uid
      ) AS ${this.quoteIdentifier(aliasName)} ON (${this.quoteIdentifier(aliasName)}.uid = project.uid)
    `;
  }

  async generateMilestoneQuery(userId, projectFilters = [],milestoneFilters = []) {
    const dao = this;

    let query = `
      SELECT
        project.uid, project.department_name, project.title, project.impact, project.is_completed,
        project.sro, project.description, project.created_at, project.updated_at,

        \`milestones\`.uid AS \`milestones.uid\`,
        \`milestones\`.project_uid AS \`milestones.projectUid\`,
        \`milestones\`.description AS \`milestones.description\`,
        \`milestones\`.date AS \`milestones.date\`,
        \`milestones\`.created_at AS \`milestones.created_at\`,
        \`milestones\`.updated_at AS \`milestones.updated_at\`,

        \`milestones->milestoneFieldEntries\`.milestone_field_id AS \`milestones.milestoneFieldEntries.milestoneFieldId\`,
        \`milestones->milestoneFieldEntries\`.milestone_uid AS \`milestones.milestoneFieldEntries.milestoneUid\`,
        \`milestones->milestoneFieldEntries\`.value AS \`milestones.milestoneFieldEntries.value\`,
        \`milestones->milestoneFieldEntries\`.created_at AS \`milestones.milestoneFieldEntries.created_at\`,
        \`milestones->milestoneFieldEntries\`.updated_at AS \`milestones.milestoneFieldEntries.updated_at\`,

        \`milestones->milestoneFieldEntries->milestoneField\`.id AS \`milestones.milestoneFieldEntries.milestoneField.id\`,
        \`milestones->milestoneFieldEntries->milestoneField\`.name AS \`milestones.milestoneFieldEntries.milestoneField.name\`,
        \`milestones->milestoneFieldEntries->milestoneField\`.display_name AS \`milestones.milestoneFieldEntries.milestoneField.displayName\`,
        \`milestones->milestoneFieldEntries->milestoneField\`.type AS \`milestones.milestoneFieldEntries.milestoneField.type\`,
        \`milestones->milestoneFieldEntries->milestoneField\`.config AS \`milestones.milestoneFieldEntries.milestoneField.config\`,
        \`milestones->milestoneFieldEntries->milestoneField\`.is_active AS \`milestones.milestoneFieldEntries.milestoneField.isActive\`,
        \`milestones->milestoneFieldEntries->milestoneField\`.is_required AS \`milestones.milestoneFieldEntries.milestoneField.isRequired\`,
        \`milestones->milestoneFieldEntries->milestoneField\`.import_column_name AS \`milestones.milestoneFieldEntries.milestoneField.importColumnName\`,
        \`milestones->milestoneFieldEntries->milestoneField\`.order AS \`milestones.milestoneFieldEntries.milestoneField.order\`,
        \`milestones->milestoneFieldEntries->milestoneField\`.description AS \`milestones.milestoneFieldEntries.milestoneField.description\`

      FROM
        user INNER JOIN department_user ON (user.id = department_user.user_id)
        INNER JOIN project ON (department_user.department_name = project.department_name)
        LEFT OUTER JOIN milestone AS milestones ON (project.uid = milestones.project_uid)
        LEFT OUTER JOIN milestone_field_entry AS \`milestones->milestoneFieldEntries\` ON (milestones.uid = \`milestones->milestoneFieldEntries\`.milestone_uid)
        LEFT OUTER JOIN milestone_field AS \`milestones->milestoneFieldEntries->milestoneField\` ON (\`milestones->milestoneFieldEntries->milestoneField\`.id = \`milestones->milestoneFieldEntries\`.milestone_field_id)
    `;

    projectFilters.forEach( async(filter) => {
      const fieldId = await dao.getProjectFieldId(filter);
      query += this.generateMilestoneProjectFieldFilter(fieldId,filter.value);
    });

    milestoneFilters.forEach( async(filter) => {
      const fieldId = await dao.getMilestoneFieldId(filter);
      query += this.generateMilestoneMilestoneFieldFilter(fieldId,filter.value);
    });

    query += `
      WHERE
        ${this.generateMatch("user","id",userId)}
    `;

    return [query,{}];
  }

  async getProjectFields(userId, projectFilters = [],milestoneFilters = []) {
    const [query,binds] = await this.generateProjectQuery(userId,projectFilters,milestoneFilters);

    const options = {
      "hasJoin": true,
      "include": [{
        "model": ProjectFieldEntry,
        "include": {
          "model": ProjectField
        }
      }],
      "replacements": binds,
      "type": this.sequelize.QueryTypes.SELECT
    };

    Project._validateIncludedElements(options);
    const result = await this.sequelize.query(query,options);
    return result;
  }

  async getMilestoneFields(userId, projectFilters = [],milestoneFilters = []) {
    const [query,binds] = await this.generateMilestoneQuery(userId,projectFilters,milestoneFilters);

    const options = {
      "hasJoin": true,
      "include": [{
        "model": Milestone,
        "include": {
          "model": MilestoneFieldEntry,
          "include": {
            "model": MilestoneField
          }
        }
      }],
      "replacements": binds,
      "type": this.sequelize.QueryTypes.SELECT
    };

    Project._validateIncludedElements(options);
    const result = await this.sequelize.query(query,options);
    return result;
  }
}

module.exports = DAO;
