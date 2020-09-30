const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const config = require('config');
const { clearCacheMiddleware } = require('services/redis');

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
      clearCacheMiddleware
    ];
  }
}

module.exports = EntitySubmissionSuccess;
