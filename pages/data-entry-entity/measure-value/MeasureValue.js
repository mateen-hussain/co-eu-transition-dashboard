/* eslint-disable no-prototype-builtins */
const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const entityUserPermissions = require('middleware/entityUserPermissions');
const moment = require('moment');
const Category = require('models/category');
const Entity = require('models/entity');
const CategoryField = require('models/categoryField');
const EntityFieldEntry = require('models/entityFieldEntry');
const logger = require('services/logger');

const get = require('lodash/get');
const groupBy = require('lodash/groupBy');
const uniqWith = require('lodash/uniqWith');
const uniq = require('lodash/uniq');

const measures = require('helpers/measures')

class MeasureValue extends Page {
  get url() {
    return paths.dataEntryEntity.measureValue;
  }

  get pathToBind() {
    return `${this.url}/:metricId/:date`;
  }

  get editUrl() {
    return `${this.url}/${this.req.params.measureId}`;
  }

  get successfulMode() {
    return this.req.params && this.req.params.successful;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader']),
      entityUserPermissions.assignEntityIdsUserCanAccessToLocals
    ];
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
    const userIsAdmin = this.req.user.isAdmin;

    if(!userIsAdmin) {
      // const entityIdsUserCanAccess = this.res.locals.entitiesUserCanAccess.map(entity => entity.id);
      // where.id = { [Op.in]: entityIdsUserCanAccess };
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
      entity['entityFieldEntries'] = await measures.getEntityFields(entity.id)
    }

    const measureEntitiesMapped = this.mapMeasureFieldsToEntity(entities, themeCategory);

    // In certain case when a measure is the only item in the group, we need to up allow users to update the
    // overall value which is stored in the RAYG row.
    return measureEntitiesMapped.reduce((data, entity) => {
      if(entity.filter === 'RAYG') {
        data.raygEntity = entity
      } else {
        data.measuresEntities.push(entity)
      }
      return data;
    }, { measuresEntities: [] });
  }


  async getMeasure() {
    const measureCategory = await measures.getCategory('Measure');
    const themeCategory = await measures.getCategory('Theme');
    const { measuresEntities, raygEntity }  = await this.getMeasureEntities(measureCategory, themeCategory);
    console.log('entities', measuresEntities)
    // const measuresEntities = await this.getMeasureEntitiesFromGroup(groupEntities);

    if (measuresEntities.length === 0) {
      return this.res.redirect(paths.dataEntryEntity.measureList);
    }

    // const uniqMetricIds = uniq(groupEntities.map(measure => measure.metricID));

    return {
      measuresEntities,
      raygEntity,
    }
  }

  async getMeasureData() {
    const { measuresEntities, raygEntity, uniqMetricIds }  = await this.getMeasure();
    measures.applyLabelToEntities(measuresEntities)

    const measureForSelectedDate = measuresEntities.filter(measure => measure.date === this.req.params.date)

    if (!moment(this.req.params.date, 'DD/MM/YYYY').isValid() || measureForSelectedDate.length === 0) {
      return this.res.redirect(paths.dataEntryEntity.measureList);
    }

    return {
      latest: measuresEntities[measuresEntities.length - 1],
      raygEntity: raygEntity,
      measureForSelectedDate,
      selectedDate: this.req.params.date.split('/')
    }
  }



  async getRequest(req, res) {
    if(!this.req.user.isAdmin && !this.res.locals.entitiesUserCanAccess.length) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }

    super.getRequest(req, res);
  }
}

module.exports = MeasureValue;