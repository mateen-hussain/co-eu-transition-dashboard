const Page = require('core/pages/page');
const { paths } = require('config');
const xlsx = require('services/xlsx');
const fileUpload = require('express-fileupload');
const flash = require('middleware/flash');
const authentication = require('services/authentication');
const BulkImport = require('models/bulkImport');
const Category = require('models/category');
const uuid = require('uuid');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const logger = require('services/logger');
const { Op } = require('sequelize');
const config = require('config');

class EntityBulkUpload extends Page {
  static get isEnabled() {
    return config.features.entityData;
  }
  get url() {
    return paths.dataEntryEntity.bulkUpload;
  }

  get middleware() {
    return [
      ...authentication.protect(['administrator']),
      fileUpload({ safeFileNames: true }),
      flash
    ];
  }

  async categories() {
    const categories = await Category.findAll();

    return categories.map(category => {
      return {
        value: category.name,
        text: category.name
      };
    });
  }

  get mode() {
    const pathToCompare = this.req.path === '/' ? paths.dataEntryEntity.bulkUpload : `${paths.dataEntryEntity.bulkUpload}${this.req.path}`;

    switch(pathToCompare) {
    case paths.dataEntryEntity.bulkUploadEntity:
      return 'bulk-upload';
    case paths.dataEntryEntity.bulkUploadSignOff:
      return 'sign-off';
    case paths.dataEntryEntity.bulkUploadFile:
      return 'upload-file';
    default:
      return 'upload-file';
    }
  }

  async importData(req) {
    const data = xlsx.parseEntities(req.files.import.data);

    await BulkImport.create({
      id: uuid.v4(),
      userId: req.user.id,
      data,
      category: req.body.category
    });
  }

  async postRequest(req, res) {
    switch(this.mode) {
    case 'upload-file':
      if (!req.files) {
        req.flash('Please upload a spreadsheet in order to continue');
        return res.redirect(this.url);
      }
      if (!req.body.category) {
        req.flash('Please select a category to continue');
        return res.redirect(this.url);
      }
      try {
        await this.importData(req, res);
        res.redirect(paths.dataEntryEntity.import);
      } catch (error) {
        req.flash('Error parsing Excel file, please check the file and try again');
        logger.error(`Error uploading excel document: ${error}`);
        return res.redirect(this.url);
      }
      break;
    default:
      res.sendStatus(METHOD_NOT_ALLOWED);
    }
  }

  async getRequest(req, res) {
    const activeImport = await BulkImport.findOne({
      where: {
        userId: req.user.id,
        category: {
          [Op.not]: 'data-entry-old'
        }
      }
    });

    if (activeImport) {
      return res.redirect(paths.dataEntryEntity.import);
    }

    super.getRequest(req, res);
  }
}


module.exports = EntityBulkUpload;

