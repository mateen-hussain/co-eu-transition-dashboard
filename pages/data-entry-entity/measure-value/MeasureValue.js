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
const measures = require('helpers/measures')
const get = require('lodash/get');

class MeasureValue extends Page {
  static get isEnabled() {
    return config.features.measureValue;
  }

  get url() {
    return config.paths.dataEntryEntity.measureValue;
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

    super.getRequest(req, res);
  }

  async postRequest(req, res) {
    const canUserAccessMetric = await this.canUserAccessMetric();

    if(!req.user.isAdmin && !canUserAccessMetric) {
      return res.status(METHOD_NOT_ALLOWED).send('You do not have permisson to access this resource.');
    }

    return res.redirect(this.originalUrl);
  }

  mapMeasureFieldsToEntity(measureEntities) {
    return measureEntities.map(entity => {

      const parentPublicId = get(entity, 'parents[0].publicId')

      const entityMapped = {
        id: entity.id,
        publicId: entity.publicId,
        parentPublicId
      };

      entity.entityFieldEntries.map(entityfieldEntry => {
        entityMapped[entityfieldEntry.categoryField.name] = entityfieldEntry.value;
      });

      return entityMapped;
    });
  }

  async getMeasureEntities(measureCategory) {

    const entities = await Entity.findAll({
      where: { categoryId: measureCategory.id },
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
        }]
      }]
    });

    for (const entity of entities) {
      entity['entityFieldEntries'] = await measures.getEntityFields(entity.id)
    }

    const measureEntitiesMapped = this.mapMeasureFieldsToEntity(entities);

    // In certain case when a measure is the only item in the group, we need to up allow users to update the
    // overall value which is stored in the RAYG row.
    return measureEntitiesMapped.reduce((data, entity) => {
      if(entity.filter === 'RAYG') {
        data.raygEntities.push(entity)
      } else {
        data.measuresEntities.push(entity)
      }
      return data;
    }, { measuresEntities: [], raygEntities: [] });
  }


  async getMeasure() {
    const measureCategory = await measures.getCategory('Measure');
    const { measuresEntities, raygEntities }  = await this.getMeasureEntities(measureCategory);

    if (measuresEntities.length === 0) {
      return this.res.redirect(paths.dataEntryEntity.measureList);
    }

    return {
      measuresEntities,
      raygEntities,
    }
  }

  generateInputValues(uiInputs, measureForSelectedDate, selecteDate) {
    const measureValues = { 
      entities: {},
      date: selecteDate.split('/')
    }

    measureForSelectedDate.forEach(measure => {
      uiInputs.forEach(uiInput => {
        // label and label2 are generated from applyLabelToEntities using filter, filet2, filterValue, filterValue2
        // we can use this to match the input to the value
        if (measure.label && measure.label2 && uiInput.label && uiInput.label2) {
          if (measure.label === uiInput.label && measure.label2 ===  uiInput.label2) {
            measureValues.entities[uiInput.id] = measure.value
          }
        } else if (measure.label && uiInput.label) {
          if (measure.label === uiInput.label) {
            measureValues.entities[uiInput.id] = measure.value
          }
        } else {
          measureValues.entities[uiInput.id] = measure.value
        }
      })
    });
    
    return measureValues;
  }

  async getMeasureData() {
    const { measuresEntities }  = await this.getMeasure();
    measures.applyLabelToEntities(measuresEntities)
    const uiInputs = measures.calculateUiInputs(measuresEntities);

    const measuresForSelectedDate = measuresEntities.filter(measure => measure.date === this.req.params.date)

    if (!moment(this.req.params.date, 'DD/MM/YYYY').isValid() || measuresForSelectedDate.length === 0) {
      return this.res.redirect(paths.dataEntryEntity.measureList);
    }

    const measureValues = this.generateInputValues(uiInputs, measuresForSelectedDate, this.req.params.date)

    return {
      latest: measuresEntities[measuresEntities.length - 1],
      fields: uiInputs,
      measureValues
    }
  }

}

module.exports = MeasureValue;