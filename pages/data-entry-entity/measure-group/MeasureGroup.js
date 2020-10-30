/* eslint-disable no-prototype-builtins */
const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const Category = require('models/category');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const logger = require('services/logger');
const CategoryField = require('models/categoryField');
const flash = require('middleware/flash');
const sequelize = require('services/sequelize');
const filterMetricsHelper = require('helpers/filterMetrics');

class MeasureGroup extends Page {
  get url() {
    return paths.dataEntryEntity.measureGroup;
  }

  get pathToBind() {
    return `${this.url}/:groupId/:successful(successful)?`;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader']),
      flash
    ];
  }

  get successfulMode() {
    return this.req.params && this.req.params.successful;
  }

  get editUrl() {
    return `${this.url}/${this.req.params.groupId}`;
  }

  get getSuccessUrl() {
    return `${this.url}/${this.req.params.groupId}/successful`;
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
      errors.push("You must enter a group description");
    }

    if(!group.value || isNaN(group.value)) {
      errors.push("Group total value must be a number");
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

  async getGroup() {
    const groups = await this.getGroupEntities();

    if(!groups.length) {
      throw new Error('Could not find measure');
    }

    return groups[0];
  }

  async updateGroup(data) {
    const measureCategory = await this.getCategory('Measure');
    const categoryFields = await Category.fieldDefinitions('Measure');
    const groups = await this.getGroupEntities();

    if(!groups.length) {
      throw new Error('Could not find group');
    }

    for (const group of groups) {
      const measureToSave = Object.assign({}, group, {
        groupDescription: data.groupDescription,
        value: data.value
      });

      const transaction = await sequelize.transaction();
      try {
        await Entity.import(measureToSave, measureCategory, categoryFields, { transaction, ignoreParents: true, updatedAt: true });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
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

  async getGroupEntities() {
    let entities = await Entity.findAll({
      include: [{
        model: EntityFieldEntry,
        where: { value: this.req.params.groupId },
        include: {
          model: CategoryField,
          where: { name: 'groupId' },
        }
      }]
    });

    for (const entity of entities) {
      entity['entityFieldEntries'] = await this.getEntityFields(entity.id)
    }

    entities = await filterMetricsHelper.filterMetrics(this.req.user,entities);

    const measureEntitiesMapped = entities.map(entity => {
      const entityMapped = {
        id: entity.id,
        publicId: entity.publicId
      };

      entity.entityFieldEntries.map(entityfieldEntry => {
        entityMapped[entityfieldEntry.categoryField.name] = entityfieldEntry.value;
      });

      return entityMapped;
    });

    return measureEntitiesMapped.filter(entity => entity.filter === 'RAYG');
  }

  async getEntityFields(entityId) {
    const entityFieldEntries = await EntityFieldEntry.findAll({
      where: { entity_id: entityId },
      include: CategoryField
    });

    if (!entityFieldEntries) {
      logger.error(`EntityFieldEntry export, error finding entityFieldEntries`);
      throw new Error(`EntityFieldEntry export, error finding entityFieldEntries`);
    }

    return entityFieldEntries;
  }

}

module.exports = MeasureGroup;
