/* eslint-disable no-prototype-builtins */
const Page = require('core/pages/page');
const { paths } = require('config');
const { Op } = require('sequelize');
const config = require('config');
const authentication = require('services/authentication');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const Category = require('models/category');
const Entity = require('models/entity');
const CategoryField = require('models/categoryField');
const EntityFieldEntry = require('models/entityFieldEntry');
const logger = require('services/logger');
const sequelize = require('services/sequelize');
const entityUserPermissions = require('middleware/entityUserPermissions');
const flash = require('middleware/flash');
const rayg = require('helpers/rayg');
const validation = require('helpers/validation');
const parse = require('helpers/parse');
const filterMetricsHelper = require('helpers/filterMetrics');
const { buildDateString } = require('helpers/utils');
const get = require('lodash/get');
const groupBy = require('lodash/groupBy');
const uniqWith = require('lodash/uniqWith');
const uniq = require('lodash/uniq');

const moment = require('moment');

class MeasureEdit extends Page {
  static get isEnabled() {
    return config.features.measureUpload;
  }

  get url() {
    return paths.dataEntryEntity.measureEdit;
  }

  get measureUrl() {
    return `${this.url}/${this.req.params.metricId}/${this.req.params.groupId}`
  }

  get addUrl() {
    return `${this.measureUrl}/add`
  }

  get editUrl() {
    return `${this.measureUrl}/edit`
  }

  get pathToBind() {
    return `${this.url}/:metricId/:groupId/:type?`;
  }

  get addMeasure() {
    return this.req.params && this.req.params.type == 'add';
  }

  get editMeasure() {
    return this.req.params && this.req.params.type == 'edit';
  }

  get successfulMode() {
    return this.req.params && this.req.params.type == 'successful';
  }

  get postData () {
    return this.req.body;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader']),
      flash,
      entityUserPermissions.assignEntityIdsUserCanAccessToLocals
    ];
  }

  async getRequest(req, res) {
    if(!this.req.user.isAdmin && !this.res.locals.entitiesUserCanAccess.length) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }

    super.getRequest(req, res);
  }

  async getGroupEntities(measureCategory, themeCategory) {
    const where = { categoryId: measureCategory.id };
    const userIsAdmin = this.req.user.isAdmin;

    if(!userIsAdmin) {
      const entityIdsUserCanAccess = this.res.locals.entitiesUserCanAccess.map(entity => entity.id);
      where.id = { [Op.in]: entityIdsUserCanAccess };
    }

    let entities = await Entity.findAll({
      where,
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
        }, {
          // get direct parents of outcome statement i.e. theme ( and possibly another outcome statement )
          model: Entity,
          as: 'parents',
          include: [{
            separate: true,
            model: EntityFieldEntry,
            include: CategoryField
          }, {
            model: Category
          }]
        }]
      }]
    });

    for (const entity of entities) {
      entity['entityFieldEntries'] = await this.getEntityFields(entity.id)
    }

    entities = await filterMetricsHelper.filterMetrics(this.req.user,entities);


    const measureEntitiesMapped = this.mapMeasureFieldsToEntity(entities, themeCategory);

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

  async getCategory(name) {
    const category = await Category.findOne({
      where: { name }
    });

    if (!category) {
      logger.error(`Category export, error finding Measure category`);
      throw new Error(`Category export, error finding Measure category`);
    }

    return category;
  }

  mapMeasureFieldsToEntity(measureEntities, themeCategory) {
    return measureEntities.map(entity => {
      const theme = get(entity, 'parents[0].parents').find(parentEntity => {
        return parentEntity.categoryId === themeCategory.id;
      });

      const themeName = theme.entityFieldEntries.find(fieldEntry => {
        return fieldEntry.categoryField.name === 'name';
      });

      const parentPublicId = get(entity, 'parents[0].publicId')

      const entityMapped = {
        id: entity.id,
        publicId: entity.publicId,
        theme: themeName.value,
        parentPublicId
      };

      entity.entityFieldEntries.map(entityfieldEntry => {
        entityMapped[entityfieldEntry.categoryField.name] = entityfieldEntry.value;
      });

      entityMapped.colour = rayg.getRaygColour(entityMapped);

      return entityMapped;
    });
  }

  async getMeasureEntitiesFromGroup(groupEntities) {
    const measureEntities = groupEntities.filter(entity => entity.metricID === this.req.params.metricId)
    const sortedEntities = measureEntities.sort((a, b) => moment(a.date, 'DD/MM/YYYY').valueOf() - moment(b.date, 'DD/MM/YYYY').valueOf());
    return sortedEntities;
  }

  async getMeasure() {
    const measureCategory = await this.getCategory('Measure');
    const themeCategory = await this.getCategory('Theme');
    const { groupEntities, raygEntities }  = await this.getGroupEntities(measureCategory, themeCategory);

    const measuresEntities = await this.getMeasureEntitiesFromGroup(groupEntities);

    if (measuresEntities.length === 0) {
      return this.res.redirect(paths.dataEntryEntity.measureList);
    }

    const uniqMetricIds = uniq(groupEntities.map(measure => measure.metricID));

    return {
      measuresEntities,
      raygEntities,
      uniqMetricIds
    }
  }

  applyLabelToEntities(entities) {
    entities.forEach(entity => {
      if (entity.filter && entity.filterValue) {
        entity.label = `${entity.filter} : ${entity.filterValue}`
      }

      if (entity.filter2 && entity.filterValue2) {
        entity.label2 = `${entity.filter2} : ${entity.filterValue2}`
      }
    })
  }

  groupEntitiesByDateAndFilter(measures) {
    const measureByDate = groupBy(measures, measure => measure.date);
    // Grouped by date And filter
    return Object.keys(measureByDate).reduce((acc, key) => {
      const dataGroupedByFilterOrMetric = groupBy(measureByDate[key], measure => measure.filterValue || measure.metricID);
      acc[key] = this.sortGroupedEntityData(dataGroupedByFilterOrMetric);
      return acc
    }, {})
  }

  sortGroupedEntityData(groupedEntityData) {
    // Ensure the order within the group is the same
    Object.keys(groupedEntityData).forEach(group => {
      if (groupedEntityData[group][0].filter && groupedEntityData[group][0].filter2) {
        groupedEntityData[group] = groupedEntityData[group].sort((a, b) => a.filterValue2.localeCompare(b.filterValue2))
      } else if (groupedEntityData[group][0].filter) {
        groupedEntityData[group] = groupedEntityData[group].sort((a, b) => a.filterValue.localeCompare(b.filterValue))
      }
    });
    return groupedEntityData;
  }

  calculateUiInputs(measureEntities) {
    const lastestEntitiyEntry = measureEntities[measureEntities.length - 1];
    const filterdEntities = measureEntities.filter(measure => measure.date === lastestEntitiyEntry.date);

    return uniqWith(
      filterdEntities,
      (locationA, locationB) => {
        if (locationA.filter && locationA.filter2) {
          return locationA.filterValue === locationB.filterValue && locationA.filterValue2 === locationB.filterValue2
        } else if (locationA.filter) {
          return locationA.filterValue === locationB.filterValue
        } else {
          return locationA.metricID
        }
      }
    );
  }

  async getMeasureData() {
    const { measuresEntities, raygEntities, uniqMetricIds }  = await this.getMeasure();
    this.applyLabelToEntities(measuresEntities)
    const groupedMeasureEntities = groupBy(measuresEntities, measure => measure.date);
    const uiInputs = this.calculateUiInputs(measuresEntities);

    const doesHaveFilter = measuresEntities.find(measure => !!measure.filter);
    const isOnlyMeasureInGroup = uniqMetricIds.length === 1;
    const isCommentsOnlyMeasure = measuresEntities[measuresEntities.length - 1].commentsOnly;
    const displayOverallRaygDropdown = isCommentsOnlyMeasure || (doesHaveFilter && isOnlyMeasureInGroup);

    return {
      latest: measuresEntities[measuresEntities.length - 1],
      grouped: groupedMeasureEntities,
      fields: uiInputs,
      raygEntity: raygEntities[0],
      displayOverallRaygDropdown,
      uniqMetricIds
    }
  }

  async getEntitiesToBeCloned(entityIds) {
    const where = { id: entityIds }
    const userIsAdmin = this.req.user.isAdmin;

    if (!userIsAdmin) {
      const entityIdsUserCanAccess = this.res.locals.entitiesUserCanAccess.map(entity => entity.id);
      const cansUserAccessAllRequiredEntities = entityIds.every(id => entityIdsUserCanAccess.includes(id));

      if (!cansUserAccessAllRequiredEntities) {
        logger.error(`Permissions error , user does not have access to all entities`);
        throw new Error(`Permissions error, user does not have access to all entities`);
      }
    }

    const entities = await Entity.findAll({
      where,
      include: [{
        model: EntityFieldEntry,
        include: CategoryField
      },{
        model: Entity,
        as: 'parents',
        include: [{
          separate: true,
          model: EntityFieldEntry,
          include: CategoryField
        }, {
          model: Category
        }]
      }]
    });

    const statementCategory = await this.getCategory('Statement');

    return entities.map(entity => {

      const statementEntity = entity.parents.find(parent => {
        return parent.categoryId === statementCategory.id;
      });

      const entityMapped = {
        id: entity.id,
        parentStatementPublicId: statementEntity.publicId,
      };

      entity.entityFieldEntries.map(entityfieldEntry => {
        entityMapped[entityfieldEntry.categoryField.name] = entityfieldEntry.value;
      });

      return entityMapped;
    });
  }

  createEntitiesFromClonedData(merticEntities, formData) {
    const { entities } = formData;
    return merticEntities.map(entity => {
      const { id, ...entityNoId } = entity;
      return {
        ...entityNoId,
        value: entities[id],
        date: buildDateString(formData)
      }
    });
  }

  async validateFormData(formData, measuresEntities = []) {
    const uiInputs = this.calculateUiInputs(measuresEntities)
    const errors = [];

    if (!moment(buildDateString(formData), 'YYYY-MM-DD').isValid()) {
      errors.push("Invalid date");
    }

    const isDateDuplicated = measuresEntities.some(entity => moment(buildDateString(formData), 'YYYY-MM-DD').isSame(moment(entity.date, 'DD/MM/YYYY')))

    if (isDateDuplicated) {
      errors.push("Date already exists");
    }

    if (!formData.entities) {
      errors.push("Missing entity values");
    }

    if (formData.entities) {
      // Check the number of submitted entities matches the expected number
      const submittedEntityId = Object.keys(formData.entities);

      const haveAllEntitesBeenSubmitted = uiInputs.every(entity => submittedEntityId.includes(entity.id.toString()));

      if (!haveAllEntitesBeenSubmitted) {
        errors.push("Missing entity values");
      }

      submittedEntityId.forEach(entityId => {
        const entityValue = formData.entities[entityId]
        if (entityValue.length === 0 || isNaN(entityValue)) {
          errors.push("Invalid field value");
        }
      })
    }

    return errors;
  }

  async validateEntities(entities) {
    const categoryFields = await Category.fieldDefinitions('Measure');
    const parsedEntities = parse.parseItems(entities, categoryFields, true);

    const errors = [];
    if (!parsedEntities || !parsedEntities.length) {
      errors.push({ error: 'No entities found' });
    }

    const entityErrors = validation.validateItems(parsedEntities, categoryFields);
    errors.push(...entityErrors)

    return {
      errors,
      parsedEntities
    }
  }

  async postRequest(req, res) {
    if(!this.req.user.isAdmin && !this.res.locals.entitiesUserCanAccess.length) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }

    if (this.addMeasure) {
      return await this.addMeasureEntityData(req.body)
    }

    if (this.editMeasure) {
      return await this.updateMeasureInformation(req.body)
    }

    return res.redirect(this.measureUrl);
  }

  async updateMeasureInformation(formData) {
    const formErrors = this.validateMeasureInformation(formData);
    const URLHash = '#measure-information';

    if (formErrors && formErrors.length) {
      return this.renderRequest(this.res, { errors: formErrors });
    }

    const updatedEntites = await this.updateMeasureEntities(formData);
    return await this.saveMeasureData(updatedEntites, URLHash, { ignoreParents: true });
  }

  async updateMeasureEntities(data) {
    const { measuresEntities, raygEntities, uniqMetricIds } = await this.getMeasure();
    const doesNotHaveFilter = !measuresEntities.find(measure => !!measure.filter);
    const isOnlyMeasureInGroup = uniqMetricIds.length === 1;
    const isCommentsOnlyMeasure = data.commentsOnly === 'Yes';

    const updateMeasures = measuresEntities.map(entity => {
      const dataToUpdate = {
        publicId: entity.publicId,
        name: data.name,
        additionalComment: data.additionalComment || '',
      };

      // if comments only, do not update the thresholds, but do update the value. This means that both the metric row and RAYG row have the same value
      if(isCommentsOnlyMeasure) {
        dataToUpdate.value = data.groupValue;
      } else {
        dataToUpdate.redThreshold = data.redThreshold;
        dataToUpdate.aYThreshold = data.aYThreshold;
        dataToUpdate.greenThreshold = data.greenThreshold;
      }

      return dataToUpdate;
    });

    raygEntities.forEach(raygEntity => {
      if(isCommentsOnlyMeasure) {
      // if comment only measure, make sure we update the overall rayg value
        updateMeasures.push({
          publicId: raygEntity.publicId,
          value: data.groupValue,
          name: data.name,
          additionalComment: data.additionalComment || ''
        });
      } else if (isOnlyMeasureInGroup && doesNotHaveFilter) {
      // if a measure has NO filter values and is the only measure within a group, we want to update the threshold values
        updateMeasures.push({
          publicId: raygEntity.publicId,
          redThreshold: data.redThreshold,
          aYThreshold: data.aYThreshold,
          greenThreshold: data.greenThreshold,
          name: data.name,
          additionalComment: data.additionalComment || ''
        })
      } else if (data.groupValue && isOnlyMeasureInGroup) {
      // We want to update the RAYG value when an item is the only measure within a group which HAS filter values
        updateMeasures.push({
          publicId: raygEntity.publicId,
          value: data.groupValue,
          name: data.name,
          additionalComment: data.additionalComment || ''
        })
      }
    })

    return updateMeasures
  }

  validateMeasureInformation(formData) {
    const isCommentsOnlyMeasure = formData.commentsOnly === 'Yes';
    const errors = [];

    if (!formData.name || !formData.name.trim().length) {
      errors.push("You must enter a name");
    }

    if(!isCommentsOnlyMeasure) {
      if (!formData.redThreshold || isNaN(formData.redThreshold)) {
        errors.push("Red threshold must be a number");
      }

      if (!formData.aYThreshold || isNaN(formData.aYThreshold)) {
        errors.push("Amber/Yellow threshold must be a number");
      }

      if(!formData.greenThreshold || isNaN(formData.greenThreshold)) {
        errors.push("Green threshold must be a number");
      }

      if (!isNaN(formData.redThreshold) && !isNaN(formData.aYThreshold) && parseInt(formData.redThreshold) > parseInt(formData.aYThreshold)) {
        errors.push("The red threshold must be lower than the amber/yellow threshold");
      }

      if (!isNaN(formData.aYThreshold) && !isNaN(formData.greenThreshold) && parseInt(formData.aYThreshold) > parseInt(formData.greenThreshold)) {
        errors.push("The Amber/Yellow threshold must be lower than the green threshold");
      }
    }

    if (formData.groupValue && isNaN(formData.groupValue)) {
      errors.push("Overall RAYG value must be a number");
    }

    return errors;
  }

  // If adding a new value for a measure which is the only measure within a group and which also has no filter,
  // update the rayg row value as well
  async updateRaygRowForSingleMeasureWithNoFilter(newEntities = [], formData, measuresEntities, raygEntities, uniqMetricIds) {
    const doesNotHaveFilter = !measuresEntities.find(measure => !!measure.filter);
    const isOnlyMeasureInGroup = uniqMetricIds.length === 1;
    
    // We only want to update the the RAYG row when the date is newer than the current entires
    // measuresEntities is already sorted by date so we know the last entry in the array will contain the latest date
    const latestDate = measuresEntities[measuresEntities.length -1].date;
    const newDate = buildDateString(formData)
    const isDateNewer =  moment(newDate, 'YYYY-MM-DD').isAfter(moment(latestDate, 'DD/MM/YYYY'));

    if (isOnlyMeasureInGroup && doesNotHaveFilter && isDateNewer) {
      const { value } = newEntities[0];
      // We need to set the parentStatementPublicId as the import will remove and recreate the entitiy in the entityparents table
      raygEntities.forEach(raygEntity => {
        newEntities.push({
          publicId: raygEntity.publicId,
          parentStatementPublicId: raygEntity.parentPublicId,
          date: newDate,
          value
        })
      })
    }

    return newEntities
  }

  async addMeasureEntityData (formData) {
    const { measuresEntities, raygEntities, uniqMetricIds } = await this.getMeasure();
    
    const formValidationErrors = await this.validateFormData(formData, measuresEntities);
    if (formValidationErrors.length > 0) {
      return this.renderRequest(this.res, { errors: formValidationErrors });
    }

    const clonedEntities = await this.getEntitiesToBeCloned(Object.keys(formData.entities))
    const newEntities = await this.createEntitiesFromClonedData(clonedEntities, formData)
    const { errors, parsedEntities } = await this.validateEntities(newEntities);

    const entitiesToBeSaved = await this.updateRaygRowForSingleMeasureWithNoFilter(parsedEntities, formData, measuresEntities, raygEntities, uniqMetricIds)

    if (errors.length > 0) {
      return this.renderRequest(this.res, { errors: ['Error in entity data'] });
    }

    const URLHash = `#data-entries`;
    return await this.saveMeasureData(entitiesToBeSaved, URLHash);
  }

  async saveMeasureData(entities, URLHash, options = {}) {
    const categoryName = 'Measure'
    const category = await Category.findOne({
      where: { name: categoryName }
    });
    const categoryFields = await Category.fieldDefinitions(categoryName);
    const transaction = await sequelize.transaction();
    let redirectUrl = this.measureUrl;

    try {
      for(const entity of entities) {
        await Entity.import(entity, category, categoryFields, { transaction, ...options });
      }
      await transaction.commit();
      redirectUrl += '/successful';
    } catch (error) {
      logger.error(error);
      this.req.flash(['Error saving measure data']);
      await transaction.rollback();
    }
    return this.res.redirect(`${redirectUrl}${URLHash}`);
  }
}

module.exports = MeasureEdit;
