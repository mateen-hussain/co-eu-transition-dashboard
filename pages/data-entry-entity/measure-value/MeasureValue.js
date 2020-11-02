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

class MeasureValue extends Page {
  static get isEnabled() {
    return config.features.measureValue;
  }

  get url() {
    return config.paths.dataEntryEntity.measureValue;
  }

  get pathToBind() {
    return `${this.url}/:type/:metricId/:groupId/:date/:successful(successful)?`;
  }

  get editUrl() {
    const { metricId, groupId, date } = this.req.params;
    return `${this.url}/edit/${metricId}/${groupId}/${encodeURIComponent(date)}`;
  }

  get deleteUrl() {
    const { metricId, groupId, date } = this.req.params;
    return `${this.url}/delete/${metricId}/${groupId}/${encodeURIComponent(date)}`;
  }

  get deleteMeasure() {
    return this.req.params && this.req.params.type == 'delete';
  }

  get editMeasure() {
    return this.req.params && this.req.params.type == 'edit';
  }


  get successfulMode() {
    return this.req.params && this.req.params.successful;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader']),
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

    const { measureEntities }  = await this.getMeasure();
    const measuresForSelectedDate = measureEntities.filter(measure => measure.date === this.req.params.date)

    if (!moment(this.req.params.date, 'DD/MM/YYYY').isValid() || (measuresForSelectedDate.length === 0 && !this.successfulMode)) {
      return this.res.redirect(config.paths.dataEntryEntity.measureList);
    }

    super.getRequest(req, res);
  }

  async postRequest(req, res) {
    const canUserAccessMetric = await this.canUserAccessMetric();

    if(!req.user.isAdmin && !canUserAccessMetric) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }

    if (this.editMeasure) {
      return await this.updateMeasureValues(req.body);
    }

    if (this.deleteMeasure) {
      return await this.deleteMeasureValues();
    }
  }

  async deleteMeasureValues() {
    const { measureEntities, raygEntities, uniqMetricIds } = await this.getMeasure();
    const entitiesForSelectedDate = measureEntities.filter((measure) => measure.date === this.req.params.date);

    // If there is only a single entry (single value or group of measure values) when sorted by date, 
    // we want to prevent the user from being able to delete this last entry
    const measureByDate = groupBy(measureEntities, measure => measure.date);

    if (Object.keys(measureByDate).length === 1) {
      this.req.flash(["Measure must contain at least one set of values"]);
      return this.res.redirect(this.deleteUrl);
    }

    //If the latest value for a measure is deleted, which is the only item in the group and has no filter value, 
    // we need to update the rayg row 
    const updatedRaygEntities = await this.onDeleteUpdateRaygRowForSingleMeasureWithNoFilter(measureEntities, raygEntities, uniqMetricIds);

    return await this.deleteAndUpdateRaygMeasureData(entitiesForSelectedDate, updatedRaygEntities);
  }

  async onDeleteUpdateRaygRowForSingleMeasureWithNoFilter(measureEntities, raygEntities, uniqMetricIds) {
    const updatedRaygEntites = [];
    const doesNotHaveFilter = !measureEntities.find(measure => !!measure.filter);
    const isOnlyMeasureInGroup = uniqMetricIds.length === 1;

    // measureEntities is already sorted by date so we know the last entry will have the newest date
    const latestEntry = measureEntities[measureEntities.length -1];
    const entitiesForSelectedDate = measureEntities.filter((measure) => measure.date === this.req.params.date);

    // We want to update the the RAYG row when the entity being deleted is the only item in a group, has no filters
    // and it is the latest entity according to it's date field
    if (isOnlyMeasureInGroup && doesNotHaveFilter && latestEntry.publicId === entitiesForSelectedDate[0].publicId) {

      // Remove entity with current data and sort the array to be in date order
      const entitiesExcludingCurrentDate = measureEntities.filter((measure) => measure.date !== this.req.params.date);
      entitiesExcludingCurrentDate.sort((a, b) => moment(a.date, 'DD/MM/YYYY').valueOf() - moment(b.date, 'DD/MM/YYYY').valueOf());
    
      const latestEntryAfterSortingByDate = entitiesExcludingCurrentDate[entitiesExcludingCurrentDate.length -1];
      const value = latestEntryAfterSortingByDate.value;
      const date = moment(latestEntryAfterSortingByDate.date, 'DD/MM/YYYY').format('YYYY-MM-DD');

      raygEntities.forEach(raygEntity => {
        updatedRaygEntites.push({
          publicId: raygEntity.publicId,
          parentStatementPublicId: raygEntity.parentStatementPublicId,
          date,
          value
        })
      })
    }

    return updatedRaygEntites
  }

  async deleteAndUpdateRaygMeasureData(entitiesForSelectedDate, updatedRaygEntities = []) {
    const transaction = await sequelize.transaction();
    let redirectUrl = this.deleteUrl;

    try {
      for (const entity of entitiesForSelectedDate) {
        await Entity.delete(entity.id, { transaction });
      }

      if (updatedRaygEntities.length > 0) {
        const category = await measures.getCategory("Measure");
        const categoryFields = await Category.fieldDefinitions("Measure");
        for (const entity of updatedRaygEntities) {
          await Entity.import(entity, category, categoryFields, { transaction, ignoreParents: true, updatedAt: true });
        }
      }
      
      await transaction.commit();
      redirectUrl += "/successful";
    } catch (error) {
      logger.error(error);
      this.req.flash(["Error deleting measure data"]);
      await transaction.rollback();
    }
    return this.res.redirect(redirectUrl);
  }

  getPublicIdFromExistingEntity(clondedEntity, entitiesForSelectedDate) {
    let publicIdForClonedEntity;

    entitiesForSelectedDate.forEach((entitiy) => {
      // label and label2 are generated from applyLabelToEntities using filter, filter2, filterValue, filterValue2
      // we can use this to match the data submitted to the entities for the selected day
      if (clondedEntity.label && clondedEntity.label2 && entitiy.label && entitiy.label2) {
        if (clondedEntity.label === entitiy.label && clondedEntity.label2 === entitiy.label2) {
          publicIdForClonedEntity = entitiy.publicId;
        }
      } else if (clondedEntity.label && entitiy.label) {
        if (clondedEntity.label === entitiy.label) {
          publicIdForClonedEntity = entitiy.publicId;
        }
      } else {
        publicIdForClonedEntity = entitiy.publicId;
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

  // If updating a measure value which is the only measure within a group and which also has no filter,
  // update the rayg row value as well
  async updateRaygRowForSingleMeasureWithNoFilter(newEntities = [], formData, measureEntities, raygEntities, uniqMetricIds) {
    const doesNotHaveFilter = !measureEntities.find(measure => !!measure.filter);
    const isOnlyMeasureInGroup = uniqMetricIds.length === 1;

    // We want to update the the RAYG row when the date is newer than the current entires
    // measuresEntities is already sorted by date so we know the last entry in the array will contain the latest date
    const latestEntry = measureEntities[measureEntities.length -1];
    let newDate = buildDateString(formData);
    const newDateMoment = moment(newDate, 'YYYY-MM-DD');
    const isDateLatestOrNewer =  newDateMoment.isSameOrAfter(moment(latestEntry.date, 'DD/MM/YYYY'));
    const { updateRAYG } = formData;

    if (isOnlyMeasureInGroup && doesNotHaveFilter) {
      let { value } = newEntities[0];
      let latestEntryUpdate = false;

      // If the latest meausevalue was updated, the date could have been changed to a point in the past.
      // To find the correct value for the RAYG row, we need to combined the submited form datawith the 
      // current measure values and re-sort by date, this will give us the correct entry and value
      if (latestEntry.publicId === newEntities[0].publicId) {
        latestEntryUpdate = true;

        const measureEntitiesCloned = cloneDeep(measureEntities);
        const clonedLatestEntry = measureEntitiesCloned[measureEntitiesCloned.length -1];
        clonedLatestEntry.date = newDateMoment.format('DD/MM/YYYY');
        clonedLatestEntry.value = newEntities[0].value;

        //Re-sort the array and get the latest value 
        measureEntitiesCloned.sort((a, b) => moment(a.date, 'DD/MM/YYYY').valueOf() - moment(b.date, 'DD/MM/YYYY').valueOf());
      
        const latestEntryAfterSorting = measureEntitiesCloned[measureEntitiesCloned.length -1];
        value = latestEntryAfterSorting.value;
        newDate = moment(latestEntryAfterSorting.date, 'DD/MM/YYYY').format('YYYY-MM-DD');
      }

      if (isDateLatestOrNewer || updateRAYG == 'true' || latestEntryUpdate) {
       
        // We need to set the parentStatementPublicId as the import will remove and recreate the entitiy in the entityparents table
        raygEntities.forEach(raygEntity => {
          newEntities.push({
            publicId: raygEntity.publicId,
            parentStatementPublicId: raygEntity.parentStatementPublicId,
            date: newDate,
            value
          })
        })
      }
    }

    return newEntities
  }

  async updateMeasureValues(formData) {
    const { measureEntities, raygEntities, uniqMetricIds } = await this.getMeasure();
    
    measures.applyLabelToEntities(measureEntities);
    
    const entitiesForSelectedDate = measureEntities.filter((measure) => measure.date === this.req.params.date);
    const entitiesExcludingCurrentDate = measureEntities.filter((measure) => measure.date !== this.req.params.date);

    formData.entities = utils.removeNulls(formData.entities)

    const formValidationErrors = await measures.validateFormData(formData, entitiesExcludingCurrentDate);

    if (formValidationErrors.length > 0) {
      return this.renderRequest(this.res, { errors: formValidationErrors });
    }

    const entitiesToBeCloned = this.getEntitiesIdsToBeCloned(measureEntities, formData.entities);
    const newEntities = await this.createEntitiesFromClonedData(entitiesToBeCloned, formData, entitiesForSelectedDate);

    const { errors, parsedEntities } = await measures.validateEntities(newEntities);

    const entitiesToBeSaved = await this.updateRaygRowForSingleMeasureWithNoFilter(parsedEntities, formData, measureEntities, raygEntities, uniqMetricIds)

    if (errors.length > 0) {
      return this.renderRequest(this.res, { errors: ["Error in entity data"] });
    }

    return await this.saveMeasureData(entitiesToBeSaved, { updatedAt: true });
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
      return this.res.redirect(config.paths.dataEntryEntity.measureList);
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
    const { measureEntities, uniqMetricIds } = await this.getMeasure();
    measures.applyLabelToEntities(measureEntities);
    const uiInputs = measures.calculateUiInputs(measureEntities);

    const measuresForSelectedDate = measureEntities.filter((measure) => measure.date === this.req.params.date);

    if (!moment(this.req.params.date, "DD/MM/YYYY").isValid() || (measuresForSelectedDate.length === 0 && !this.successfulMode)) {
      return this.res.redirect(config.paths.dataEntryEntity.measureList);
    }

    const measureValues = this.generateInputValues(uiInputs, measuresForSelectedDate, this.req.params.date);
    
    // measuresEntities are already sorted by date, so the last entry is the newest
    const latestEntity = measureEntities[measureEntities.length - 1];
    const backLink = `${config.paths.dataEntryEntity.measureEdit}/${latestEntity.metricID}/${latestEntity.groupID}`;
    const doesHaveFilter = measureEntities.find(measure => !!measure.filter);
    const isOnlyMeasureInGroup = uniqMetricIds.length === 1;
    const isLatestDateOrInTheFuture =  moment(latestEntity.date, 'DD/MM/YYYY').isAfter(moment());
    const displayRaygValueCheckbox =  !doesHaveFilter && isOnlyMeasureInGroup && isLatestDateOrInTheFuture;
    // Dont show delete if there is only a single date for the measure
    const showDeleteButton = Object.keys(groupBy(measureEntities, measure => measure.date)).length > 1;

    return {
      latest: latestEntity,
      fields: uiInputs,
      measureValues,
      backLink,
      displayRaygValueCheckbox,
      showDeleteButton
    };
  }
}

module.exports = MeasureValue;
