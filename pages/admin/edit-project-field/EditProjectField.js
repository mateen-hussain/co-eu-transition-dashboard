const Page = require('core/pages/page');
const { paths } = require('config');
const FieldEntryGroup = require('models/fieldEntryGroup');
const ProjectField = require('models/projectField');
const flash = require('middleware/flash');
const authentication = require('services/authentication');
const logger = require('services/logger');

class EditProjectField extends Page {
  get url() {
    return paths.admin.projectField;
  }

  get middleware() {
    return [
      ...authentication.protect(['admin']),
      flash
    ];
  }

  get pathToBind() {
    return `${this.url}/:id(\\d+)?/:summary(summary)?`;
  }

  get editMode() {
    return this.req.params && this.req.params.id;
  }

  get summaryMode() {
    return this.req.params && this.req.params.summary;
  }

  async getRequest(req, res) {
    await this.setData();

    super.getRequest(req, res);
  }

  next() {
    if(this.summaryMode) {
      return this.res.redirect(paths.admin.projectFieldList);
    }

    if(this.editMode) {
      return this.res.redirect(`${this.url}/${this.req.params.id}/summary`);
    }

    return this.res.redirect(`${this.url}/summary`);
  }

  async saveFieldToDatabase() {
    const field = this.data;
    if (field.id === 'temp') {
      delete field.id;
    }

    try {
      await ProjectField.upsert(field);
      this.clearData();
      this.next();
    } catch (error) {
      logger.error(error);
      this.req.flash(`Error when creating / editing field: ${error}`);
      this.res.redirect(this.req.originalUrl);
    }
  }

  async postRequest(req, res) {
    if(this.summaryMode) {
      return await this.saveFieldToDatabase();
    }
    if ((!req.body['displayName']) || (!req.body['importColumnName']) || (!req.body['description'])) {
      req.flash('You must fill in all the fields before you can review the field details');
      return res.redirect(this.url);
    } else {
      super.postRequest(req);
    }
  }

  async setData() {
    if (this.summaryMode) {
      return;
    }

    if (this.editMode) {
      if(!this.data.id || this.data.id === 'temp') {
        const data = await ProjectField.findOne({
          where: {
            id: this.req.params.id
          }
        });

        this.saveData(data);
      }
    } else if (this.data.id !== 'temp') {
      return this.clearData();
    }
  }

  async getProjectGroups() {
    return await FieldEntryGroup.findAll();
  }
}

module.exports = EditProjectField;