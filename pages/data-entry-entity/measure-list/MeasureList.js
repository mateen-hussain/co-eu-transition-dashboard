/* eslint-disable no-prototype-builtins */
const Page = require('core/pages/page');
const { paths } = require('config');
const config = require('config');
const authentication = require('services/authentication');
const measures = require('helpers/measures.js');

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

  async getMeasures() {
    const measureCategory = await measures.getCategory('Measure');
    console.log('***measureCategory', measureCategory)
    const themeCategory = await measures.getCategory('Theme');
    console.log('***themeCategory', themeCategory)
    const measureEntities = await measures.getMeasureEntities({
      measureCategory, 
      themeCategory, 
      user: this.req.user
    });
    const measureEntitiesGrouped = await measures.groupMeasures(measureEntities);

    return {
      grouped: measureEntitiesGrouped.filter(measure => measure.children.length > 1),
      notGrouped: measureEntitiesGrouped.filter(measure => measure.children.length === 1)
    }
  }
}

module.exports = MeasureList;
