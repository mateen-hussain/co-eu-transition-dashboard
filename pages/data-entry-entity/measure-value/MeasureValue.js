/* eslint-disable no-prototype-builtins */
const Page = require('core/pages/page');
const config = require('config');
const authentication = require('services/authentication');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const entityUserPermissions = require('middleware/entityUserPermissions');

class MeasureValue extends Page {
  static get isEnabled() {
    return config.features.measureValue;
  }

  get url() {
    return config.paths.dataEntryEntity.measureValue;
  }

  get pathToBind() {
    return `${this.url}/:measureId`;
  }

  get editUrl() {
    return `${this.url}/${this.req.params.measureId}`;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader']),
      entityUserPermissions.assignEntityIdsUserCanAccessToLocals
    ];
  }

  async getRequest(req, res) {
    if(!this.req.user.isAdmin && !this.res.locals.entitiesUserCanAccess.length) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }

    super.getRequest(req, res);
  }
}

module.exports = MeasureValue;