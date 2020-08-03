const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const config = require('config');

class SubmissionSuccess extends Page {
  static get isEnabled() {
    return config.features.entityData;
  }

  get url() {
    return paths.dataEntry.submissionSuccess;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader', 'administrator'])
    ];
  }
}

module.exports = SubmissionSuccess;
