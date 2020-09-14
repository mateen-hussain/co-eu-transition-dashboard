const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const config = require('config');
const { clearCache } = require('services/nodeCache');

class EntitySubmissionSuccess extends Page {
  static get isEnabled() {
    return config.features.entityData;
  }

  get url() {
    return paths.dataEntryEntity.submissionSuccess;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader']),
      clearCache
    ];
  }
}

module.exports = EntitySubmissionSuccess;
