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
      const publicIds = measures.map(measure => measure.entityPublicId);
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

  async getMeasures() {
    const category = await Category.findOne({
      where: {
        name: 'Measure'
      }
    });

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

      if(!measureName) return;

      return {
        text: measureName.value,
        value: measure.publicId
      };
    });

    const empty = { text: '-- Select --' };

    return [empty, ...measuresAsItems];
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