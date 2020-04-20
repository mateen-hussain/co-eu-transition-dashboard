const Page = require('core/pages/page');
const { paths } = require('config');
const xlsx = require('services/xlsx');
const fileUpload = require('express-fileupload');
const flash = require('middleware/flash');
const authentication = require('services/authentication');
const config = require('config');
const BulkImport = require('models/bulkImport');
const uuid = require('uuid');
const logger = require('services/logger');

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
    const data = xlsx.parse(req.files.import.data);

    await BulkImport.create({
      id: uuid.v4(),
      userId: req.user.id,
      data
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
      req.flash(`Error uploading excel document: ${error.message}, please check the file and try again`);
      logger.error(`Error uploading excel document: ${error}`);
      return res.redirect(this.url);
    }
  }

  async getRequest(req, res) {
    const activeImport = await BulkImport.findOne({
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