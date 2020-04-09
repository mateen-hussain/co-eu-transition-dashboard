const Page = require('core/pages/page');
const { paths } = require('config');

class BulkUpload extends Page {
  get url() {
    return paths.dataEntry.bulkUpload;
  }

  get mode() {
    const pathToCompare = this.req.path === '/' ? paths.dataEntry.bulkUpload : `${paths.dataEntry.bulkUpload}${this.req.path}`;

    switch(pathToCompare) {
    case paths.dataEntry.bulkUploadSignOff:
      return 'sign-off';
    case paths.dataEntry.bulkUploadFile:
      return 'upload-file';
    default:
      return 'bulk-upload';
    }
  }
}

module.exports = BulkUpload;
