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
      ...authentication.protect(['uploader'])
    ];
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

  async getMeasureEntities(measureCategory, themeCategory) {
    const where = { categoryId: measureCategory.id };

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

  groupMeasures(measures) {
    const measureEntitiesGrouped = groupBy(measures, measure => {
      return measure.groupID;
    });

    const measureGroups = Object.values(measureEntitiesGrouped).reduce((measureGroups, group) => {
      const groupMeasure = group.find(measure => measure.filter === 'RAYG');
      // if no RAYG row then ignore as its not shown on dashboard
      if(!groupMeasure) {
        return measureGroups;
      }

      const nonRaygRows = group.filter(measure => measure.filter !== 'RAYG');

      const measuresGroupedByMetricId = groupBy(nonRaygRows, entity => entity.metricID);
      groupMeasure.children = Object.values(measuresGroupedByMetricId).map(measures => {
        const measuresSortedByDate = measures.sort((a, b) => moment(b.date, 'DD/MM/YYYY').valueOf() - moment(a.date, 'DD/MM/YYYY').valueOf());
        measuresSortedByDate[0].colour = rayg.getRaygColour(measuresSortedByDate[0]);
        return measuresSortedByDate[0];
      });

      groupMeasure.colour = rayg.getRaygColour(groupMeasure);

      measureGroups.push(groupMeasure);

      return measureGroups;
    }, []);

    return measureGroups;
  }

  async getMeasures() {
    const measureCategory = await this.getCategory('Measure');
    const themeCategory = await this.getCategory('Theme');
    const measureEntities = await this.getMeasureEntities(measureCategory, themeCategory);
    const measureEntitiesGrouped = await this.groupMeasures(measureEntities);

    return {
      grouped: measureEntitiesGrouped.filter(measure => measure.children.length > 1),
      notGrouped: measureEntitiesGrouped.filter(measure => measure.children.length === 1)
    }
  }
}

module.exports = MeasureList;
