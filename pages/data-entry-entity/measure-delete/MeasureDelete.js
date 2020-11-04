/* eslint-disable no-prototype-builtins */
const Page = require('core/pages/page');
const config = require('config');
const authentication = require('services/authentication');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const moment = require('moment');
const Category = require('models/category');
const Entity = require('models/entity');
const CategoryField = require('models/categoryField');
const EntityFieldEntry = require('models/entityFieldEntry');
const flash = require('middleware/flash');
const measures = require('helpers/measures')
const { buildDateString } = require("helpers/utils");
const sequelize = require("services/sequelize");
const logger = require("services/logger");
const uniq = require('lodash/uniq');
const utils = require('helpers/utils');
const cloneDeep = require('lodash/cloneDeep');
const groupBy = require('lodash/groupBy');
const { lte } = require('lodash');

class MeasureDelete extends Page {
  get url() {
    return config.paths.dataEntryEntity.measureDelete;
  }

  get pathToBind() {
    return `${this.url}/:metricId/:groupId/:successful(successful)?`;
  }

  get successfulMode() {
    return this.req.params && this.req.params.successful;
  }

  get backUrl() {
    let url = `${config.paths.dataEntryEntity.measureEdit}/${this.req.params.metricId}/${this.req.params.groupId}`;
    if (this.successfulMode) {
      url = config.paths.dataEntryEntity.measureList
    }
    return url
  }

  get middleware() {
    return [
      ...authentication.protect(['admin']),
      flash
    ];
  }

  async handler(req, res) {
    if(!req.user.isAdmin) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }
   
    return super.handler(req, res);
  }

  async postRequest(req, res) {
    try {
      await this.deleteMeasure();
    } catch (error) {
      logger.error(error);
      req.flash(["An error occoured when deleting the measure."]);
      return res.redirect(this.req.originalUrl);
    }

    return res.redirect(`${this.req.originalUrl}/successful`);
  }

  async deleteMeasure() {
    return true;
    const transaction = await sequelize.transaction();

    const { measureEntities, uniqMetricIds, raygEntities } = await this.getMeasure();

    try {
      for (const entity of entitiesForSelectedDate) {
        await Entity.delete(entity.id, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  async mapMeasureFieldsToEntity(measureEntities) {
    return measureEntities.map((entity) => {

      const entityMapped = {
        id: entity.id,
        publicId: entity.publicId,
      };

      entity.entityFieldEntries.map(entityfieldEntry => {
        entityMapped[entityfieldEntry.categoryField.name] = entityfieldEntry.value;
      });

      return entityMapped;
    });
  }

  async getGroupEntities(measureCategory) {
    const entities = await Entity.findAll({
      where: { categoryId: measureCategory.id },
      include: [{
        model: EntityFieldEntry,
        where: { value: this.req.params.groupId },
        include: {
          model: CategoryField,
          where: { name: 'groupId' },
        }
      },{
        // get direct parent of measure i.e. outcome statement
        model: Entity,
        as: 'parents',
        include: [{
          model: Category
        }]
      }]
    });

    for (const entity of entities) {
      entity["entityFieldEntries"] = await measures.getEntityFields(entity.id);
    }

    const measureEntitiesMapped = await this.mapMeasureFieldsToEntity(entities);

    // In certain case when a measure is the only item in the group, we need to up allow users to update the
    // overall value which is stored in the RAYG row.
    return measureEntitiesMapped.reduce((data, entity) => {
      if(entity.filter === 'RAYG') {
        data.raygEntities.push(entity)
      } else {
        data.groupEntities.push(entity)
      }
      return data;
    }, { groupEntities: [], raygEntities: [] });
  }

  async getMeasure() {
    const measureCategory = await measures.getCategory("Measure");
    const { groupEntities, raygEntities }  = await this.getGroupEntities(measureCategory);

    const measureEntities = await measures.getMeasureEntitiesFromGroup(groupEntities, this.req.params.metricId);

    if (measureEntities.length === 0) {
      return this.res.redirect(config.paths.dataEntryEntity.measureList);
    }

    const uniqMetricIds = uniq(groupEntities.map(measure => measure.metricID))

    return {
      measureEntities,
      raygEntities,
      uniqMetricIds
    };
  }

  async getMeasureData() {
    const { measureEntities } = await this.getMeasure();

    // measuresEntities are already sorted by date, so the last entry is the newest
    const latestEntity = measureEntities[measureEntities.length - 1];
  
    return latestEntity
  }
}

module.exports = MeasureDelete;
