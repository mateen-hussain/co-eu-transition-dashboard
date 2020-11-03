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

class MeasureDelete extends Page {
  get url() {
    return config.paths.dataEntryEntity.measureDelete;
  }

  get pathToBind() {
    return `${this.url}/:metricId/:groupId/:successful(successful)?`;
  }

  get deleteUrl() {
    const { metricId, groupId } = this.req.params;
    return `${this.url}/${metricId}/${groupId}`;
  }

  get successfulMode() {
    return this.req.params && this.req.params.successful;
  }

  get middleware() {
    return [
      ...authentication.protect(['admin']),
      flash
    ];
  }

  async canUserAccessMetric() {
    const metricsUserCanAccess = await this.req.user.getPermittedMetricMap();
    return Object.keys(metricsUserCanAccess).includes(this.req.params.metricId)
  }

  async getRequest(req, res) {
    const canUserAccessMetric = await this.canUserAccessMetric();

    if(!req.user.isAdmin && !canUserAccessMetric) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }

    // const { measureEntities }  = await this.getMeasure();
    // const measuresForSelectedDate = measureEntities.filter(measure => measure.date === this.req.params.date)

    // if (!moment(this.req.params.date, 'DD/MM/YYYY').isValid() || (measuresForSelectedDate.length === 0 && !this.successfulMode)) {
    //   return this.res.redirect(config.paths.dataEntryEntity.measureList);
    // }

    super.getRequest(req, res);
  }

  async postRequest(req, res) {
    const canUserAccessMetric = await this.canUserAccessMetric();

    if(!req.user.isAdmin && !canUserAccessMetric) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }
    
  }


  async mapMeasureFieldsToEntity(measureEntities) {
    const statementCategory = await measures.getCategory("Statement");

    return measureEntities.map((entity) => {
      const statementEntity = entity.parents.find((parent) => {
        return parent.categoryId === statementCategory.id;
      });

      const entityMapped = {
        id: entity.id,
        publicId: entity.publicId,
        parentStatementPublicId: statementEntity.publicId,
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
    const { measureEntities, uniqMetricIds } = await this.getMeasure();

    // measuresEntities are already sorted by date, so the last entry is the newest
    const latestEntity = measureEntities[measureEntities.length - 1];
    const backLink = `${config.paths.dataEntryEntity.measureEdit}/${latestEntity.metricID}/${latestEntity.groupID}`;

    return {
      latest: latestEntity,
      backLink,
    };
  }
}

module.exports = MeasureDelete;
