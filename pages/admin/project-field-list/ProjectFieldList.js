const Page = require('core/pages/page');
const { paths } = require('config');
const ProjectField = require('models/projectField');
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
    return await ProjectField.findAll();
  }

  async getProjectGroups() {
    return await FieldEntryGroup.findAll();
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
        if(!field.order || !field.id) {
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
    const orderValues = req.body, fields = {}, key = 'fields';
    fields[key] = [];
    for (var i=0; i<orderValues.fields[0].id.length; i++) {
      fields[key].push({ 
        'id' : orderValues.fields[0].id[i], 
        'order' : orderValues.fields[0].order[i] 
      });
    }

    if (this.editMode) {
      await this.saveFieldOrder(fields);
    }
    res.redirect(this.url);
  }
}

module.exports = ProjectFieldList;