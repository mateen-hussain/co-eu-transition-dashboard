/* eslint-disable no-prototype-builtins */
const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const entityUserPermissions = require('middleware/entityUserPermissions');
const { Op } = require('sequelize');

class MeasureValue extends Page {
  get url() {
    return paths.dataEntryEntity.measureValue;
  }

  get pathToBind() {
    return `${this.url}/:measureId/:delete(delete)?/:deleteSuccess(delete-success)?/:editSuccess(success)?`;
  }

  get measureId() {
    return this.req.params.measureId;
  }

  get editUrl() {
    return `${this.url}/${this.req.params.measureId}`;
  }

  get editMode() {
    return !this.editSuccessMode && !this.deleteSuccessMode && !this.deleteValueMode;
  }

  get editSuccessMode() {
    return this.req.params && this.req.params.editSuccess;
  }

  get deleteSuccessMode() {
    return this.req.params && this.req.params.deleteSuccess;
  }

  get deleteValueMode() {
    return this.req.params && this.req.params.delete;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader']),
      entityUserPermissions.assignEntityIdsUserCanAccessToLocals
    ];
  }

  async deleteValue() {
    // const entities = [{ id: 1234 }, { id: 12345 }];
    // const entityIds = entities.map(entity => entity.id);
    //
    // await Entity.destroy({
    //   where: {
    //     entityId: {
    //       [Op.in]: entityIds
    //     }
    //   }
    // }, options);

    this.res.redirect(`${this.url}/${this.measureId}/delete-success`);
  }

  async postRequest(req, res) {
    if(this.deleteValueMode) {
      return this.deleteValue();
    }

    super.getRequest(req, res);
  }

  async getRequest(req, res) {
    if(!this.req.user.isAdmin && !this.res.locals.entitiesUserCanAccess.length) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }

    super.getRequest(req, res);
  }
}

module.exports = MeasureValue;
