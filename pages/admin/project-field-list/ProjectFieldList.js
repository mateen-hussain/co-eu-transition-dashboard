const Page = require('core/pages/page');
const { paths } = require('config');
const ProjectField = require('models/projectField');
const Project = require('models/project');
const FieldEntryGroup = require('models/fieldEntryGroup');
const sequelize = require('services/sequelize');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const logger = require('services/logger');

class ProjectFieldList extends Page {
  get url() {
    return paths.admin.projectFieldList;
  }

  get pathToBind() {
    return `${this.url}/:editMode(edit)?`;
  }

  async getFields() {
    return await Project.fieldDefintions();
  }

  async getProjectGroups() {
    return await FieldEntryGroup.findAll({
      order: ['order']
    });
  }

  get editMode() {
    return this.req.params && this.req.params.editMode;
  }

  get middleware() {
    return [
      ...authentication.protect(['admin']),
      flash
    ];
  }

  async saveFieldOrder(body) {
    const transaction = await sequelize.transaction();
    try {
      for(const field of body.fields) {
        if(!field.id || !field.id.length) {
          // means its not part of the project fields but a column of the project table
          continue;
        } else if(!field.order) {
          throw new Error('Field missing order or id');
        }
        const values = { order: field.order };
        await ProjectField.update(values, {
          where: { id: field.id },
          transaction
        });
      }

      await transaction.commit();
    } catch (error) {
      this.req.flash(`Error saing field order: ${error}`);
      logger.error(error);
      await transaction.rollback();
    }
  }

  async postRequest(req, res) {
    if (this.editMode) {
      await this.saveFieldOrder(req.body);
    }
    res.redirect(this.url);
  }
}

module.exports = ProjectFieldList;