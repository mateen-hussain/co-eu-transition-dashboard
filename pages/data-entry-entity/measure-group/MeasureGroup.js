/* eslint-disable no-prototype-builtins */
const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const Category = require('models/category');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const logger = require('services/logger');
const CategoryField = require('models/categoryField');
const entityUserPermissions = require('middleware/entityUserPermissions');
const flash = require('middleware/flash');
const sequelize = require('services/sequelize');

class MeasureGroup extends Page {
  get url() {
    return paths.dataEntryEntity.measureGroup;
  }

  get pathToBind() {
    return `${this.url}/:entityPublicId/:successful(successful)?`;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader']),
      entityUserPermissions.assignEntityIdsUserCanAccessToLocals,
      flash
    ];
  }

  get successfulMode() {
    return this.req.params && this.req.params.successful;
  }

  get editUrl() {
    return `${this.url}/${this.req.params.entityPublicId}`;
  }

  get getSuccessUrl() {
    return `${this.url}/${this.req.params.entityPublicId}/successful`;
  }

  async handler(req, res) {
    const isAdmin = req.user.isAdmin;
    const entityPublicIdsUserCanAccess = res.locals.entitiesUserCanAccess.map(entity => entity.publicId);
    const canAccessEntity = entityPublicIdsUserCanAccess.includes(req.params.entityPublicId);

    if(!isAdmin && !canAccessEntity) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }

    super.handler(req, res);
  }

  async getRequest(req, res) {
    if (this.successfulMode) {
      this.clearData();
    }

    super.getRequest(req, res);
  }

  validateGroup(group) {
    const errors = [];

    if(!group.groupDescription || !group.groupDescription.trim().length) {
      errors.push("You must entere a group description");
    }

    if(!group.redThreshold || isNaN(group.redThreshold)) {
      errors.push("Red threshold must be a number");
    }

    if(!group.aYThreshold || isNaN(group.aYThreshold)) {
      errors.push("Amber/Yellow threshold must be a number");
    }

    if(!group.greenThreshold || isNaN(group.greenThreshold)) {
      errors.push("Green threshold must be a number");
    }

    if(!isNaN(group.redThreshold) && !isNaN(group.aYThreshold) && group.redThreshold > group.aYThreshold) {
      errors.push("The red threshold must be lower than the amber/yellow threshold");
    }

    if(!isNaN(group.aYThreshold) && !isNaN(group.greenThreshold) && group.aYThreshold > group.greenThreshold) {
      errors.push("The Amber/Yellow threshold must be lower than the green threshold");
    }

    if(!group.value || isNaN(group.value)) {
      errors.push("Group total value must be a number");
    }

    if(group.commentsOnly && group.commentsOnly !== 'Yes') {
      errors.push("Comments Only can only equal Yes");
    }

    return errors;
  }

  async getCategory(name) {
    const category = await Category.findOne({
      where: { name }
    });

    if(!category) {
      logger.error(`Category export, error finding ${name} category`);
      throw new Error(`Category export, error finding ${name} category`);
    }

    return category;
  }

  async updateGroup(data) {
    const measureCategory = await this.getCategory('Measure');
    const categoryFields = await Category.fieldDefinitions('Measure');
    const measureEntity = await this.getMeasure();
    if(!measureEntity) {
      throw new Error('Could not find measure');
    }

    const measureToSave = Object.assign({}, measureEntity, {
      redThreshold: data.redThreshold,
      aYThreshold: data.aYThreshold,
      greenThreshold: data.greenThreshold,
      groupDescription: data.groupDescription,
      value: data.value,
      commentsOnly: data.commentsOnly !== undefined
    });

    const transaction = await sequelize.transaction();
    try {
      await Entity.import(measureToSave, measureCategory, categoryFields, { transaction, ignoreParents: true })
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async postRequest(req, res) {
    const data = Object.assign({}, req.body);
    this.saveData(data);

    const errors = await this.validateGroup(data);
    if (errors && errors.length) {
      req.flash(errors.join('<br>'));
      return res.redirect(this.req.originalUrl);
    }

    try {
      await this.updateGroup(data);
    } catch (error) {
      logger.error(error);
      req.flash("An error occoured when saving.");
      return res.redirect(this.req.originalUrl);
    }

    return res.redirect(this.getSuccessUrl);
  }

  mapMeasureFieldsToEntity(entity) {
    const entityMapped = {
      id: entity.id,
      publicId: entity.publicId
    };

    entity.entityFieldEntries.map(entityfieldEntry => {
      entityMapped[entityfieldEntry.categoryField.name] = entityfieldEntry.value;
    });

    return entityMapped;
  }

  async getMeasure() {
    const measureEntity = await Entity.findOne({
      where: {
        publicId: this.req.params.entityPublicId
      },
      include: [{
        separate: true,
        model: EntityFieldEntry,
        include: CategoryField
      }]
    });

    if(!measureEntity) {
      return {
        error: 'Could not find measure'
      };
    }

    const measureMapped = {
      id: measureEntity.id,
      publicId: measureEntity.publicId
    };

    measureEntity.entityFieldEntries.map(entityfieldEntry => {
      measureMapped[entityfieldEntry.categoryField.name] = entityfieldEntry.value;
    });

    if(measureMapped.filter !== "RAYG") {
      return {
        error: 'This is not a group'
      };
    }

    return measureMapped;
  }
}

module.exports = MeasureGroup;