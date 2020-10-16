const Page = require('core/pages/page');
const { paths } = require('config');
const flash = require('middleware/flash');
const authentication = require('services/authentication');
const { removeNulls } = require('helpers/utils');
const Category = require('models/category');
const CategoryField = require('models/categoryField');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const HeadlineMeasuresModel = require('models/headlineMeasures');
const sequelize = require('services/sequelize');
const logger = require('services/logger');
const compact = require('lodash/compact');
const get = require('lodash/get');

class HeadlineMeasures extends Page {
  get url() {
    return paths.admin.headlineMeasures;
  }

  get middleware() {
    return [
      ...authentication.protect(['admin']),
      flash
    ];
  }

  async saveData(headlineMeasures) {
    const transaction = await sequelize.transaction();
    const options = { transaction };

    try {
      await HeadlineMeasuresModel.destroy({
        where: {},
        truncate: true
      }, options);

      await HeadlineMeasuresModel.bulkCreate(headlineMeasures, options);
      await transaction.commit();
    } catch (error) {
      this.req.flash('Error saving headline measures');
      await transaction.rollback();
    }
  }

  isValid(body) {
    const headlineMeasures = removeNulls(body.headlineMeasures);
    const hasHeadlineMeasures = headlineMeasures && headlineMeasures.length;

    if(!hasHeadlineMeasures) {
      return this.req.flash('Ensure at least one headline measure has been submitted.');
    }

    const hasDuplicates = measures => {
      const publicIds = compact(measures.map(measure => measure.entityPublicId));
      return new Set(publicIds).size !== publicIds.length;
    };

    if(hasDuplicates(headlineMeasures)) {
      return this.req.flash('There are duplicate measures selected');
    }

    return true;
  }

  async postRequest(req, res) {
    if (!this.isValid(req.body)) {
      return res.redirect(this.req.originalUrl);
    }

    await this.saveData(removeNulls(req.body.headlineMeasures));
    return res.redirect(this.req.originalUrl);
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

  async getMeasures() {
    const category = await this.getCategory('measure');
    const themeCategory = await this.getCategory('theme');

    let measures = await Entity.findAll({
      where: {
        categoryId: category.id
      },
      include: [{
        model: EntityFieldEntry,
        include: {
          attributes: ['name'],
          model: CategoryField,
          where: { isActive: true },
          required: true
        } 
      }, {
        model: Entity,
        as: 'parents',
        include: [{
          model: Entity,
          as: 'parents',
          include: [{
            separate: true,
            model: EntityFieldEntry,
            include: CategoryField
          }]
        }]
      }]
    });

    measures = measures.filter(measure => {
      return measure.entityFieldEntries.find(entry => {
        return entry.categoryField.name === 'filter' && entry.value == 'RAYG';
      });
    });

    const measuresAsItems = measures.map(measure => {
      const measureName = measure.entityFieldEntries.find(entry => {
        return entry.categoryField.name === 'groupDescription';
      });

      const theme = get(measure, 'parents[0].parents').find(parentEntity => {
        return parentEntity.categoryId === themeCategory.id;
      });

      const themeName = theme.entityFieldEntries.find(fieldEntry => {
        return fieldEntry.categoryField.name === 'name';
      });

      if (!measureName || !themeName) return;

      return {
        text:  themeName.value + " - " + measureName.value,
        value: measure.publicId
      };
    });

    const empty = { text: '-- Select --' };

    return [empty, ...measuresAsItems.sort((a, b) => a.text.localeCompare(b.text))];
  }

  async getHeadlineMeasures() {
    const currentHeadlineMeasures = await HeadlineMeasuresModel.findAll({
      order: ['priority']
    });

    if(currentHeadlineMeasures.length < 20) {
      for(var i = currentHeadlineMeasures.length; i < 20; i ++) {
        currentHeadlineMeasures.push({});
      }
    }

    return currentHeadlineMeasures;
  }

  setSelected(measures, publicId) {
    return measures.map(measure => {
      return Object.assign({
        selected: measure.value == publicId
      }, measure);
    })
  }
}

module.exports = HeadlineMeasures;