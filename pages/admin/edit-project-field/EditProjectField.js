const Page = require('core/pages/page');
const { paths } = require('config');
const FieldEntryGroup = require('models/fieldEntryGroup');
const ProjectField = require('models/projectField');
const flash = require('middleware/flash');
const authentication = require('services/authentication');
const logger = require('services/logger');
const { camelCase } = require('helpers/utils');

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
    return `${this.url}/:id(\\d+)?/:summary(summary)?/:successful(successful)?`;
  }

  get editMode() {
    return this.req.params && this.req.params.id;
  }

  get summaryMode() {
    return this.req.params && this.req.params.summary;
  }

  get successfulMode() {
    return this.req.params && this.req.params.successful;
  }

  async getRequest(req, res) {
    if (this.summaryMode) {
      // there should be an id set now
      if (!this.data.id) {
        return this.res.redirect(paths.admin.projectFieldList);
      }
    } else if (!this.successfulMode) {
      await this.setData();
    }

    super.getRequest(req, res);
  }

  get editUrl() {
    let url = this.url;

    if(this.editMode) {
      url += `/${this.req.params.id}`;
    }

    return url;
  }

  next() {
    let url = this.url;

    if(this.editMode) {
      url += `/${this.req.params.id}`;
    }

    if(this.summaryMode) {
      return this.res.redirect(`${url}/successful`);
    }

    return this.res.redirect(`${url}/summary`);
  }

  async saveFieldToDatabase() {
    const field = this.data;
    if (field.id === 'temp') {
      delete field.id;
    }

    if(!field.name && field.displayName) {
      field.name = camelCase(field.displayName);
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
    if ((!req.body.displayName || !req.body.importColumnName || !req.body.description) || 
    (req.body.type == 'group' && req.body.config.options == '')) {
      req.flash('You must fill in all the fields before you can review the field details');
      return res.redirect(this.req.originalUrl);
    } else {
      super.postRequest(req);
    }
  }

  async setData() {
    if (this.editMode) {
      if(!this.data.id || this.data.id === 'temp') {
        const data = await ProjectField.findOne({
          where: {
            id: this.req.params.id
          }
        });

        if(data.config && data.config.options) {
          data.groupItems = data.config.options;
        }

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