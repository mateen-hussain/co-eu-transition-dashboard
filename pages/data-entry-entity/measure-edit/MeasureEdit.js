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
const { buildDateString, removeNulls } = require('helpers/utils');
const get = require('lodash/get');
const groupBy = require('lodash/groupBy');
const uniqWith = require('lodash/uniqWith');

const moment = require('moment');

class MeasureEdit extends Page {
  static get isEnabled() {
    return config.features.measureUpload;
  }

  get url() {
    return paths.dataEntryEntity.measureEdit;
  }

  get measureUrl() {
    return `${this.url}/${this.req.params.metricId}`
  } 

  get pathToBind() {
    return `${this.url}/:metricId/:type?/:successful(successful)?`;
  }

  get addMeasure() {
    return this.req.params && this.req.params.type == 'add';
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
      flash,
      entityUserPermissions.assignEntityIdsUserCanAccessToLocals
    ];
  }

  async getRequest(req, res) {
    if(!this.req.user.isAdmin && !this.res.locals.entitiesUserCanAccess.length) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }

    if (this.successfulMode) {
      this.clearData();
    }

    super.getRequest(req, res);
  }

  async getMeasureEntities(measureCategory, themeCategory) {
    const where = { categoryId: measureCategory.id };
    const userIsAdmin = this.req.user.isAdmin;

    if(!userIsAdmin) {
      const entityIdsUserCanAccess = this.res.locals.entitiesUserCanAccess.map(entity => entity.id);
      where.id = { [Op.in]: entityIdsUserCanAccess };
    }

    const entities = await Entity.findAll({
      where,
      include: [{
        model: EntityFieldEntry,
        where: { value: this.req.params.metricId },
        include: {
          model: CategoryField,
          where: { name: 'metricId' },
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

    const measureEntitiesMapped = this.mapMeasureFieldsToEntity(entities, themeCategory);

    return measureEntitiesMapped.filter(measure => {
      return measure.filter !== 'RAYG';
    });
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

      const entityMapped = {
        id: entity.id,
        publicId: entity.publicId,
        theme: themeName.value
      };

      entity.entityFieldEntries.map(entityfieldEntry => {
        entityMapped[entityfieldEntry.categoryField.name] = entityfieldEntry.value;
      });

      entityMapped.colour = rayg.getRaygColour(entityMapped);

      return entityMapped;
    });
  }

  async getMeasure() {
    const measureCategory = await this.getCategory('Measure');
    const themeCategory = await this.getCategory('Theme');
    const entities = await this.getMeasureEntities(measureCategory, themeCategory);

    if (entities.length === 0) {
      return this.res.redirect(paths.dataEntryEntity.measureList);
    }

    const sortedEntities = entities.sort((a, b) => moment(a.date, 'DD/MM/YYYY').valueOf() - moment(b.date, 'DD/MM/YYYY').valueOf());
    return sortedEntities;
  }

  applyLabelToEntities(entities) {
    entities.forEach(entity => {
      if (entity.filter && entity.filter2) {
        entity.label = `${entity.filterValue} - ${entity.filterValue2}`
      } else if (entity.filter) {
        entity.label = entity.filterValue
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

  groupAndOrderUiInputs (uiInputs) {
    const groupedInputs = groupBy(uiInputs, measure => measure.filterValue || measure.metricID);
    const groupedAndSortedEntityData = this.sortGroupedEntityData(groupedInputs);
    return groupedAndSortedEntityData;
  }

  async getMeasureData() {
    const measuresEntities = await this.getMeasure();
    this.applyLabelToEntities(measuresEntities)
    const groupedMeasureEntities = this.groupEntitiesByDateAndFilter(measuresEntities)
    
    const uiInputs = this.calculateUiInputs(measuresEntities)
    const measureFields = this.groupAndOrderUiInputs(uiInputs)

    return {
      latest: measuresEntities[measuresEntities.length - 1],
      grouped: groupedMeasureEntities,
      fields: measureFields
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

  async validateFormData(formData) {
    const measuresEntities = await this.getMeasure();
    const uiInputs = this.calculateUiInputs(measuresEntities) 
    const errors = [];

    if (!moment(buildDateString(formData), 'YYYY-MM-DD').isValid()) {
      errors.push("Invalid date");
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
      this.saveData(removeNulls(req.body));
      return await this.addMeasureEntityData(req.body)
    }

    if (this.editMeasure) {
      this.saveData(removeNulls(req.body));
      return await this.updateMeasureInformation(req.body)   
    }

    return res.redirect(this.measureUrl);
  }

  async updateMeasureInformation(formData) {
    const formErrors = this.validateMeasureInformation(formData);
    const URLHash = '#measure-information';

    if (formErrors && formErrors.length) {
      this.req.flash(formErrors.join('<br>'));
      return this.res.redirect(`${this.measureUrl}/${URLHash}`);
    }

    const updatedEntites = await this.updateMeasureEntities(formData);
 
    return await this.saveMeasureData(updatedEntites, URLHash, { ignoreParents: true });   
  }

  async updateMeasureEntities(data) {
    const measuresEntities = await this.getMeasure();
    return measuresEntities.map(entity => {
      return {
        publicId: entity.publicId,
        description: data.description,
        additionalComment: data.additionalComment || '',
        redThreshold: data.redThreshold,
        aYThreshold: data.aYThreshold,
        greenThreshold: data.greenThreshold
      }
    });
  }

  validateMeasureInformation(formData) {
    const errors = [];

    if (!formData.description || !formData.description.trim().length) {
      errors.push("You must enter a description");
    }

    if (!formData.redThreshold || isNaN(formData.redThreshold)) {
      errors.push("Red threshold must be a number");
    }

    if (!formData.aYThreshold || isNaN(formData.aYThreshold)) {
      errors.push("Amber/Yellow threshold must be a number");
    }

    if(!formData.greenThreshold || isNaN(formData.greenThreshold)) {
      errors.push("Green threshold must be a number");
    }

    if (!isNaN(formData.redThreshold) && !isNaN(formData.aYThreshold) && formData.redThreshold > formData.aYThreshold) {
      errors.push("The red threshold must be lower than the amber/yellow threshold");
    }

    if (!isNaN(formData.aYThreshold) && !isNaN(formData.greenThreshold) && formData.aYThreshold > formData.greenThreshold) {
      errors.push("The Amber/Yellow threshold must be lower than the green threshold");
    }
    
    return errors;
  }

  async addMeasureEntityData (formData) {
    const formValidationErrors = await this.validateFormData(formData);
    if (formValidationErrors.length > 0) {
      this.req.flash(formValidationErrors.join('<br>'));
      return this.res.redirect(this.measureUrl);
    }

    const clonedEntities = await this.getEntitiesToBeCloned(Object.keys(formData.entities))
    const newEntities = await this.createEntitiesFromClonedData(clonedEntities, formData)
    const { errors, parsedEntities } = await this.validateEntities(newEntities);

    if (errors.length > 0) {
      this.req.flash('Error in entity data');
      return this.res.redirect(this.measureUrl); 
    }
    const URLHash = `#data-entries`;
    return await this.saveMeasureData(parsedEntities, URLHash);  
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
      this.clearData();
      redirectUrl += '/successful';
    } catch (error) {
      this.req.flash('Error saving measure data');
      await transaction.rollback();
    }
    return this.res.redirect(`${redirectUrl}${URLHash}`);
  }
}

module.exports = MeasureEdit;