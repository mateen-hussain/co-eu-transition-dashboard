const Page = require('core/pages/page');
const { paths } = require('config');
const flash = require('middleware/flash');
const { removeNulls } = require('helpers/utils');
const logger = require('services/logger');
const Project = require('models/project');
const validation = require('helpers/validation');
const moment = require('moment');
const sequelize = require('services/sequelize');
const authentication = require('services/authentication');
const FieldEntryGroup = require('models/fieldEntryGroup');
const { transformDeliveryConfidenceValue } = require('helpers/display');

class EditProject extends Page {
  get url() {
    return paths.editProject;
  }

  get pathToBind() {
    return `${this.url}/:uid/:edit(edit)?/:successful(successful)?`;
  }

  get successfulMode() {
    return this.req.params && this.req.params.successful;
  }

  get signOffMode() {
    return this.req.params && !this.req.params.edit && !this.req.params.successful;
  }

  get editMode() {
    return this.req.params && this.req.params.edit;
  }

  get successfulModeUrl() {
    return `${paths.editProject}/${this.req.params.uid}/successful`
  }

  get editModeUrl() {
    return `${paths.editProject}/${this.req.params.uid}/edit`
  }

  get signOffUrl() {
    return `${paths.editProject}/${this.req.params.uid}`
  }

  next() {
    if(this.editMode) {
      return this.res.redirect(this.successfulModeUrl);
    }

    return this.res.redirect(this.signOffUrl);
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader']),
      flash
    ];
  }

  async getRequest(req, res) {
    if (this.editMode) {
      await this.setData();
    } else {
      this.clearData();
    }

    super.getRequest(req, res);
  }

  async saveFieldToDatabase(project) {
    const transaction = await sequelize.transaction();
    const projectFields = await Project.fieldDefinitions();

    try {
      await Project.import(project, projectFields, { transaction });
      await transaction.commit();
      this.next();
    } catch (error) {
      await transaction.rollback();
      logger.error(error);
      this.req.flash(`Error when editing project: ${error}`);
      this.res.redirect(this.req.originalUrl);
    }
  }

  async validateProject(project) {
    const projectFields = await this.getProjectFields();

    projectFields.forEach(field => {
      if(field.type === 'date' && project[field.name] && moment(project[field.name], 'DD/MM/YYYY').isValid()) {
        project[field.name] = moment(project[field.name], 'DD/MM/YYYY').format();
      }
    });

    const errors = validation.validateItems([project], projectFields);

    return errors.reduce((message, error) => {
      message += `${error.itemDefinition.importColumnName}: ${error.error}<br>`;
      return message;
    }, '');
  }

  async postRequest(req, res) {
    if(this.editMode) {
      const data = Object.assign({}, removeNulls(req.body));
      this.saveData(data);

      const errors = await this.validateProject(data);
      if (errors && errors.length) {
        req.flash(errors);
        return res.redirect(this.editModeUrl);
      }

      return await this.saveFieldToDatabase(data);
    }

    return res.redirect(this.req.originalUrl);
  }

  async setData() {
    const editingDifferentProject = this.data && this.data.uid != this.req.params.uid;
    if (editingDifferentProject) {
      this.clearData();
    }

    if(this.data.uid) {
      return;
    }

    const project = await this.getProject();
    const projectFields = await this.getProjectFields();

    const data = projectFields.reduce((data, field) => {
      if(project.fields.get(field.name)) {
        data[field.name] = project.fields.get(field.name).value;
      }
      return data;
    }, {});

    this.saveData(data);
  }

  transformDeliveryConfidenceValue(value) {
    return transformDeliveryConfidenceValue(value);
  }

  async getProject() {
    return await this.req.user.getProject(this.req.params.uid);
  }

  async getProjectFields() {
    return await Project.fieldDefinitions(this.req.user);
  }

  async getProjectEntryGroups() {
    return await FieldEntryGroup.findAll({
      order: ['order']
    });
  }
}

module.exports = EditProject;