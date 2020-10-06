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
      entityUserPermissions.assignEntityIdsUserCanAccessToLocals
    ];
  }

  async getRequest(req, res) {
    if(!this.req.user.isAdmin && !this.res.locals.entitiesUserCanAccess.length) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }

    super.getRequest(req, res);
  }

  async getMeasureEntities(categoryId) {
    const where = { categoryId };
    const userIsAdmin = this.req.user.roles.map(role => role.name).includes('admin');

    if(!userIsAdmin) {
      const entityIdsUserCanAccess = this.res.locals.entitiesUserCanAccess.map(entity => entity.id);
      where.id = { [Op.in]: entityIdsUserCanAccess };
    }

    const entities = await Entity.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [{
        model: EntityFieldEntry,
        where: { value: this.req.params.metricId },
        include: {
          model: CategoryField,
          where: { name: 'metricId' },
        }
      },{
        model: Entity,
        as: 'parents',
        include: [{
          model: Category
        }, {
          model: Entity,
          as: 'parents',
          include: Category
        }]
      }]
    });

    for (const entity of entities) {
      entity['entityFieldEntries'] = await this.getEntityFields(entity.id)
    }

    return entities;
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

  async getCategory() {
    const category = await Category.findOne({
      where: {
        name: 'Measure'
      }
    });

    if (!category) {
      logger.error(`Category export, error finding Measure category`);
      throw new Error(`Category export, error finding Measure category`);
    }

    return category;
  }

  async getMeasureTheme(parents) {
    const categories = await Category.findAll({
      where: {
        name: ['Statement', 'Theme']
      }
    });

    const categoriesSorted = categories.reduce((acc, category) => {
      acc[category.name] = category.id 
      return acc
    }, {})

    const statementEntity = parents.find(parent => parent.categoryId === categoriesSorted.Statement);

    if (statementEntity) {
      const themeEntity = statementEntity.parents.find(parent => parent.categoryId === categoriesSorted.Theme);

      if (!themeEntity) {
        return this.getMeasureTheme(statementEntity.parents);
      }

      themeEntity['entityFieldEntries'] = await this.getEntityFields(themeEntity.id);

      const themeEntityMapped = {
        id: themeEntity.id,
      }
        
      themeEntity.entityFieldEntries.map(entityfieldEntry => {
        themeEntityMapped[entityfieldEntry.categoryField.name] = entityfieldEntry.value;
      });

      return themeEntityMapped
    }
    
    throw new Error('No parent statement found'); 
  }

  async getMeasure() {
    const category = await this.getCategory();
    const entities = await this.getMeasureEntities(category.id);

    if (entities.length === 0) {
      return this.res.redirect(paths.dataEntryEntity.measureList);
    }

    const theme = await this.getMeasureTheme(entities[0].parents);

    return entities.map(entity => {
      const entityMapped = {
        id: entity.id,
        publicId: entity.publicId,
        theme
      };

      entity.entityFieldEntries.map(entityfieldEntry => {
        entityMapped[entityfieldEntry.categoryField.name] = entityfieldEntry.value;
      });

      entityMapped.colour = rayg.getRaygColour(entityMapped);

      return entityMapped;
    });
  }


  async getMeasureData() {
    const measures = await this.getMeasure();
    // Latest measure is first on the array as defined by the 'order by' in the query
    return measures[0];
  }
}

module.exports = MeasureEdit;