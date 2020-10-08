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
const { Op } = require('sequelize');
const entityUserPermissions = require('middleware/entityUserPermissions');
const rayg = require('helpers/rayg');
const get = require('lodash/get');
const groupBy = require('lodash/groupBy');
const sequelize = require('services/sequelize');
const moment = require('moment');
const validation = require('helpers/validation');
const parse = require('helpers/parse');
const flash = require('middleware/flash');
const { removeNulls } = require('helpers/utils');

class MeasureEdit extends Page {
  get url() {
    return paths.dataEntryEntity.measureEdit;
  }

  get pathToBind() {
    return `${this.url}/:metricId`;
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

  async getMeasureEntities(measureCategory, themeCategory) {
    const where = { categoryId: measureCategory.id };
    const userIsAdmin = this.req.user.roles.map(role => role.name).includes('admin');

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

  async getEntityFields (entityId) {
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

    return entities;
  }

  applyFilterLabel(measures) {
    measures.forEach(measure => {
      if (measure.filter && measure.filter2) {
        measure.label = `${measure.filterValue} - ${measure.filterValue2}`
      } else if (measure.filter) {
        measure.label = measure.filterValue
      }
    })
  }

  sortMeasureData (measures) {
    this.applyFilterLabel(measures)

    const measureByDate = groupBy(measures, measure => measure.date);
    // Grouped by date And filter
    return Object.keys(measureByDate).reduce((acc, key) => {
      acc[key] = groupBy(measureByDate[key], measure => measure.filterValue);
      return acc
    }, {})
  }

  async getMeasureData() {
    const measures = await this.getMeasure();
    const sortedMeasures = this.sortMeasureData(measures)

    return {
      latest: measures[measures.length - 1],
      grouped: sortedMeasures 
    }
  }

  async getEntitiesToBeCloned(entityIds) {
    const entities = await Entity.findAll({
      where: { id: entityIds },
      include: [{
        model: EntityFieldEntry,
        include: CategoryField
      },{
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
    });

    const statementCategory = await this.getCategory('Statement');

    return entities.map(entity => {
      
      const statementEntity = entity.parents.find(parent => {
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

  CreateEntitiesFromClonedData(merticEntities, formData) {
    const { entities } = formData;
    return merticEntities.map(entity => {
      const id = entity.id; 
      delete entity['id'];
      delete entity['publicId'];
      return { 
        ...entity, 
        value: entities[id],
        date: this.formatDate(formData)
      }
    });
  }

  formatDate(formData) {
    const { day, month, year } = formData;

    // Ensure day and month are always 2 digits
    const padStart = (d) => ('0' + d).slice(-2);

    return `${year}-${padStart(month)}-${padStart(day)}`;
  }

  validateFormData(formData) {
    const newDate = this.formatDate(formData)
    const errors = [];

    if (!moment(newDate, 'YYYY-MM-DD').isValid()) {
      errors.push('Invalid date');
    }

    Object.keys(formData.entities).forEach(entityId => {
      if (formData.entities[entityId].length === 0) {
        errors.push('Invalid value')
      }
    })

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

  async addMeasureEntityData (formData) {
    const formErrors = this.validateFormData(formData);

    if (formErrors.length > 0) {
      this.saveData(removeNulls(formData));
      this.req.flash('Missing form data');
      return this.res.redirect(`${this.url}/${this.req.params.metricId}`);
    }

    const clonedEntities = await this.getEntitiesToBeCloned(Object.keys(formData.entities))
    const newEntities = await this.CreateEntitiesFromClonedData(clonedEntities, formData)

    const { errors, parsedEntities } = await this.validateEntities(newEntities);

    if (errors.length > 0) {
      this.req.flash('Error in entity data');
      return this.res.redirect(`${this.url}/${this.req.params.metricId}`); 
    }
 
    await this.saveMeasureData(parsedEntities);
    return this.res.redirect(`${this.url}/${this.req.params.metricId}`);
  }

  async postRequest(req, res) {
    if(!this.req.user.isAdmin && !this.res.locals.entitiesUserCanAccess.length) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }

    if (req.body.type === 'entries') {
      return await this.addMeasureEntityData(req.body, req.params.metricId)
    }

    return res.redirect(`${this.url}/${this.req.params.metricId}`);
  }

  async saveMeasureData(entities) {
    const categoryName = 'Measure'
    const category = await Category.findOne({
      where: { name: categoryName }
    });
    const categoryFields = await Category.fieldDefinitions(categoryName);

    const transaction = await sequelize.transaction();
    try {
      for(const entity of entities) {
        await Entity.import(entity, category, categoryFields, { transaction });
      }
      await transaction.commit();
      this.clearData();
      this.req.flash('Data successfully added');
    } catch (error) {
      this.req.flash('Error saving measure data');
      await transaction.rollback();
    }
  }
}

module.exports = MeasureEdit;