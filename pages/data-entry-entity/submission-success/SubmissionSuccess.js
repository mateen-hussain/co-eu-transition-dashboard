const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');

class SubmissionSuccess extends Page {
  get url() {
    return paths.dataEntryEntity.submissionSuccess;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader', 'administrator'])
    ];
  }
}

module.exports = SubmissionSuccess;
