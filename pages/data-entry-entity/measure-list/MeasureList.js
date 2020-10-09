/* eslint-disable no-prototype-builtins */
const Page = require('core/pages/page');
const { paths } = require('config');
const config = require('config');
const authentication = require('services/authentication');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const Category = require('models/category');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const logger = require('services/logger');
const CategoryField = require('models/categoryField');
const { Op } = require('sequelize');
const entityUserPermissions = require('middleware/entityUserPermissions');
const groupBy = require('lodash/groupBy');
const get = require('lodash/get');
const moment = require('moment');
const rayg = require('helpers/rayg');

class MeasureList extends Page {
  static get isEnabled() {
    return config.features.measureUpload;
  }

  get url() {
    return paths.dataEntryEntity.measureList;
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

      return entityMapped;
    });
  }

  async getMeasureEntities(measureCategory, themeCategory) {
    const where = { categoryId: measureCategory.id };

    const userIsAdmin = this.req.user.roles.map(role => role.name).includes('admin');

    if(!userIsAdmin) {
      const entityIdsUserCanAccess = this.res.locals.entitiesUserCanAccess.map(entity => entity.id);
      where.id = { [Op.in]: entityIdsUserCanAccess };
    }

    const measureEntities = await Entity.findAll({
      where,
      include: [{
        separate: true,
        model: EntityFieldEntry,
        include: CategoryField
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

    const measureEntitiesMapped = this.mapMeasureFieldsToEntity(measureEntities, themeCategory);

    return measureEntitiesMapped.filter(measure => {
      return measure.filter !== 'RAYG';
    });
  }

  latestMeasures(measureEntities) {
    const measuresGroupedByGroupId = groupBy(measureEntities, entity => entity.groupID);
    return Object.keys(measuresGroupedByGroupId).map(measureGroupDate => {
      const measures = measuresGroupedByGroupId[measureGroupDate];
      const measuresSorted = measures.sort((a, b) => moment(b.date, 'DD/MM/YYYY').valueOf() - moment(a.date, 'DD/MM/YYYY').valueOf());
      return measuresSorted[0];
    });
  }

  async getMeasures() {
    const measureCategory = await this.getCategory('Measure');
    const themeCategory = await this.getCategory('Theme');
    const measureEntities = await this.getMeasureEntities(measureCategory, themeCategory);
    const latestMeasures = await this.latestMeasures(measureEntities);

    return latestMeasures.map(measure => {
      measure.colour = rayg.getRaygColour(measure);
      return measure;
    });
  }
}

module.exports = MeasureList;