/* eslint-disable no-prototype-builtins */
const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const moment = require('moment');
const Category = require('models/category');
const Entity = require('models/entity');
const CategoryField = require('models/categoryField');
const EntityFieldEntry = require('models/entityFieldEntry');
const measures = require('helpers/measures')
const { buildDateString } = require("helpers/utils");
const sequelize = require("services/sequelize");
const logger = require("services/logger");
const uniq = require('lodash/uniq');

class MeasureValue extends Page {
  get url() {
    return paths.dataEntryEntity.measureValue;
  }

  get pathToBind() {
    return `${this.url}/:metricId/:groupId/:date/:successful?`;
  }

  get editUrl() {
    const { metricId, groupId, date } = this.req.params;
    return `${this.url}/${metricId}/${groupId}/${encodeURIComponent(date)}`;
  }

  get successfulMode() {
    return this.req.params && this.req.params.successful;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader'])
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

    const { measureEntities }  = await this.getMeasure();
    const measuresForSelectedDate = measureEntities.filter(measure => measure.date === this.req.params.date)

    if (!moment(this.req.params.date, 'DD/MM/YYYY').isValid() || (measuresForSelectedDate.length === 0 && !this.successfulMode)) {
      return this.res.redirect(paths.dataEntryEntity.measureList);
    }

    super.getRequest(req, res);
  }

  async postRequest(req, res) {
    const canUserAccessMetric = await this.canUserAccessMetric();

    if(!req.user.isAdmin && !canUserAccessMetric) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }

    return await this.updateMeasureValues(req.body);
  }

  getPublicIdFromExistingEntity(clondedEntity, entitiesForSelectedDate) {
    let publicIdForClonedEntity;

    entitiesForSelectedDate.forEach((uiInput) => {
      // label and label2 are generated from applyLabelToEntities using filter, filter2, filterValue, filterValue2
      // we can use this to match the data submitted to the entities for the selected day
      if (clondedEntity.label && clondedEntity.label2 && uiInput.label && uiInput.label2) {
        if (clondedEntity.label === uiInput.label && clondedEntity.label2 === uiInput.label2) {
          publicIdForClonedEntity = uiInput.publicId;
        }
      } else if (clondedEntity.label && uiInput.label) {
        if (clondedEntity.label === uiInput.label) {
          publicIdForClonedEntity = uiInput.publicId;
        }
      } else {
        publicIdForClonedEntity = uiInput.publicId;
      }
    });

    return publicIdForClonedEntity;
  }

  createEntitiesFromClonedData(merticEntities, formData, entitiesForSelectedDate) {
    const { entities } = formData;
    return merticEntities.map((entity) => {
      const publicId = this.getPublicIdFromExistingEntity(entity, entitiesForSelectedDate);
      const { id, ...entityNoId } = entity;
      return {
        ...entityNoId,
        publicId,
        value: entities[id],
        date: buildDateString(formData),
      };
    });
  }

  getEntitiesIdsToBeCloned(measureEntities, formDataEntities) {
    const formEntitiesIds = Object.keys(formDataEntities).map(Number);
    return measureEntities.filter((entity) => formEntitiesIds.includes(entity.id));
  }

  // If adding a new value for a measure which is the only measure within a group and which also has no filter,
  // update the rayg row value as well
  async updateRaygRowForSingleMeasureWithNoFilter(newEntities = [], formData, measureEntities, raygEntities, uniqMetricIds) {
    const doesNotHaveFilter = !measureEntities.find(measure => !!measure.filter);
    const isOnlyMeasureInGroup = uniqMetricIds.length === 1;

    // We only want to update the the RAYG row when the date is newer than the current entires
    // measuresEntities is already sorted by date so we know the last entry in the array will contain the latest date
    const latestDate = measureEntities[measureEntities.length -1].date;
    const newDate = buildDateString(formData)
    const isDateSameOrNewer =  moment(newDate, 'YYYY-MM-DD').isSameOrAfter(moment(latestDate, 'DD/MM/YYYY'));
    const { updateRAYG } = formData;
    console.log('isDateSameOrNewer', isDateSameOrNewer)
    // if (isOnlyMeasureInGroup && doesNotHaveFilter && (isDateNewer || updateRAYG == 'true')) {
    //   const { value } = newEntities[0];
    //   // We need to set the parentStatementPublicId as the import will remove and recreate the entitiy in the entityparents table
    //   raygEntities.forEach(raygEntity => {
    //     newEntities.push({
    //       publicId: raygEntity.publicId,
    //       parentStatementPublicId: raygEntity.parentPublicId,
    //       date: newDate,
    //       value
    //     })
    //   })
    // }

    return newEntities
  }

  async updateMeasureValues(formData) {
    const { measureEntities, raygEntities, uniqMetricIds } = await this.getMeasure();
    measures.applyLabelToEntities(measureEntities);

    const entitiesForSelectedDate = measureEntities.filter((measure) => measure.date === this.req.params.date);
    const entitiesExcludingCurrentDate = measureEntities.filter((measure) => measure.date !== this.req.params.date);

    formData.entities = measures.removeBlankEntityInputValues(formData.entities);

    const formValidationErrors = await measures.validateFormData(formData, entitiesExcludingCurrentDate);

    if (formValidationErrors.length > 0) {
      return this.renderRequest(this.res, { errors: formValidationErrors });
    }

    const entitiesToBeCloned = this.getEntitiesIdsToBeCloned(measureEntities, formData.entities);
    const newEntities = await this.createEntitiesFromClonedData(entitiesToBeCloned, formData, entitiesForSelectedDate);

    const { errors, parsedEntities } = await measures.validateEntities(newEntities);

    const entitiesToBeSaved = await this.updateRaygRowForSingleMeasureWithNoFilter(parsedEntities, formData, measureEntities, raygEntities, uniqMetricIds)
    console.log('entititit', entitiesToBeSaved)
    if (errors.length > 0) {
      return this.renderRequest(this.res, { errors: ["Error in entity data"] });
    }

    // return await this.saveMeasureData(entitiesToBeSaved);
  }

  async saveMeasureData(entities, options = {}) {
    const categoryName = "Measure";
    const category = await measures.getCategory(categoryName);

    const categoryFields = await Category.fieldDefinitions(categoryName);
    const transaction = await sequelize.transaction();
    let redirectUrl = this.editUrl;

    try {
      for (const entity of entities) {
        await Entity.import(entity, category, categoryFields, { transaction, ...options });
      }
      await transaction.commit();
      redirectUrl += "/successful";
    } catch (error) {
      logger.error(error);
      this.req.flash(["Error saving measure data"]);
      await transaction.rollback();
    }
    return this.res.redirect(`${redirectUrl}`);
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
      return this.res.redirect(paths.dataEntryEntity.measureList);
    }

    const uniqMetricIds = uniq(groupEntities.map(measure => measure.metricID))

    return {
      measureEntities,
      raygEntities,
      uniqMetricIds
    };
  }

  generateInputValues(uiInputs, measureForSelectedDate, selecteDate) {
    const measureValues = {
      entities: {},
      date: selecteDate.split("/"),
    };

    measureForSelectedDate.forEach((measure) => {
      uiInputs.forEach((uiInput) => {
        // label and label2 are generated from applyLabelToEntities using filter, filter2, filterValue, filterValue2
        // we can use this to match the input to the value
        if (measure.label && measure.label2 && uiInput.label && uiInput.label2) {
          if (measure.label === uiInput.label && measure.label2 === uiInput.label2) {
            measureValues.entities[uiInput.id] = measure.value;
          }
        } else if (measure.label && uiInput.label) {
          if (measure.label === uiInput.label) {
            measureValues.entities[uiInput.id] = measure.value;
          }
        } else {
          measureValues.entities[uiInput.id] = measure.value;
        }
      });
    });

    return measureValues;
  }

  async getMeasureData() {
    const { measureEntities } = await this.getMeasure();
    measures.applyLabelToEntities(measureEntities);
    const uiInputs = measures.calculateUiInputs(measureEntities);

    const measuresForSelectedDate = measureEntities.filter((measure) => measure.date === this.req.params.date);

    if (!moment(this.req.params.date, "DD/MM/YYYY").isValid() || (measuresForSelectedDate.length === 0 && !this.successfulMode)) {
      return this.res.redirect(paths.dataEntryEntity.measureList);
    }

    const measureValues = this.generateInputValues(uiInputs, measuresForSelectedDate, this.req.params.date);
    const latestEntity = measureEntities[measureEntities.length - 1];
    const backLink = `${paths.dataEntryEntity.measureEdit}/${latestEntity.metricID}/${latestEntity.groupID}`;

    return {
      latest: latestEntity,
      fields: uiInputs,
      measureValues,
      backLink,
    };
  }
}

module.exports = MeasureValue;
