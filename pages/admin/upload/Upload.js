const Page = require('core/pages/page');
const { paths } = require('config');
const xlsx = require('services/xlsx');
const Project = require('models/project');
const ProjectField = require('models/projectField');
const Milestone = require('models/milestone');
const sequelize = require('services/sequelize');
const fileUpload = require('express-fileupload');
const flash = require('middleware/flash');
const authentication = require('services/authentication');
const logger = require('services/logger');
const validation = require('helpers/validation');
const parse = require('helpers/parse');
const { pluck } = require('helpers/utils');
const config = require('config');
const TemporaryBulkImportStore = require('models/TemporaryBulkImportStore');
const uuid = require('uuid');

class Upload extends Page {
  get url() {
    return paths.admin.upload;
  }

  get middleware() {
    return [
      ...authentication.protect(['admin']),
      fileUpload({ safeFileNames: true }),
      flash
    ];
  }

  async importData(req) {
    const [projects, milestones] = xlsx.parse(req.files.import.data);

    await TemporaryBulkImportStore.create({
      id: uuid.v4(),
      userId: req.user.id,
      data: { projects, milestones }
    });
  }

  async postRequest(req, res) {
    if (!req.files) {
      req.flash('Error no file uploaded');
      return res.redirect(this.url);
    }

    try{
      await this.importData(req, res);
      res.redirect(config.paths.admin.import);
    } catch (error) {
      req.flash('Error parsing excel file, please check the file and try again');
      return res.redirect(this.url);
    }
  }

  async getRequest(req, res) {
    const activeImport = await TemporaryBulkImportStore.findOne({
      where: {
        userId: req.user.id
      }
    });

    if (activeImport) {
      return res.redirect(config.paths.admin.import);
    }

    super.getRequest(req, res);
  }
}

module.exports = Upload;