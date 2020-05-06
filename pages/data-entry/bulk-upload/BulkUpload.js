const Page = require('core/pages/page');
const { paths } = require('config');
const xlsx = require('services/xlsx');
const fileUpload = require('express-fileupload');
const flash = require('middleware/flash');
const authentication = require('services/authentication');
const BulkImport = require('models/bulkImport');
const uuid = require('uuid');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const logger = require('services/logger');

class BulkUpload extends Page {
  get url() {
    return paths.dataEntry.bulkUpload;
  }

  get middleware() {
    return [
      ...authentication.protect(['admin']),
      fileUpload({ safeFileNames: true }),
      flash
    ];
  }

  get mode() {
    const pathToCompare = this.req.path === '/' ? paths.dataEntry.bulkUpload : `${paths.dataEntry.bulkUpload}${this.req.path}`;

    switch(pathToCompare) {
    case paths.dataEntry.bulkUploadProjectMilestone:
      return 'bulk-upload';
    case paths.dataEntry.bulkUploadSignOff:
      return 'sign-off';
    case paths.dataEntry.bulkUploadFile:
      return 'upload-file';
    default:
      return 'upload-file';
    }
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
    switch(this.mode) {
    case 'upload-file':
      if (!req.files) {
        req.flash('Please upload a completed MI Excel spreadsheet in order to continue');
        return res.redirect(this.url);
      }
      try {
        await this.importData(req, res);
        res.redirect(paths.dataEntry.import);
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
        userId: req.user.id
      }
    });

    if (activeImport) {
      return res.redirect(paths.dataEntry.import);
    }

    super.getRequest(req, res);
  }
}


module.exports = BulkUpload;

