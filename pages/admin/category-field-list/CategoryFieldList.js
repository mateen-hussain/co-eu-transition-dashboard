const Page = require('core/pages/page');
const { paths } = require('config');
const Category = require('models/category');
const CategoryField = require('models/categoryField');
const sequelize = require('services/sequelize');
const authentication = require('services/authentication');
const flash = require('middleware/flash');
const logger = require('services/logger');
const setCategoryToLocals = require('middleware/setCategoryToLocals');

class CategoryFieldList extends Page {
  get url() {
    return paths.admin.categoryFieldList;
  }

  get category() {
    return this.res.locals.category;
  }

  get pathToBind() {
    return `${this.url}/:categoryId/:editMode(edit)?`;
  }

  async getFields() {
    return await Category.fieldDefintions(this.category.name);
  }

  get editMode() {
    return this.req.params && this.req.params.editMode;
  }

  get middleware() {
    return [
      ...authentication.protect(['administrator']),
      flash,
      setCategoryToLocals
    ];
  }

  async saveFieldOrder(body) {
    const transaction = await sequelize.transaction();
    try {
      for(const field of body.fields) {
        if(!field.id || !field.id.length) {
          // means its not part of the project fields but a column of the project table
          continue;
        } else if(!field.order) {
          throw new Error('Field missing order or id');
        }
        const values = { order: field.order };
        await CategoryField.update(values, {
          where: { id: field.id },
          transaction
        });
      }

      await transaction.commit();
    } catch (error) {
      this.req.flash(`Error saing field order: ${error}`);
      logger.error(error);
      await transaction.rollback();
    }
  }

  async postRequest(req, res) {
    if (this.editMode) {
      await this.saveFieldOrder(req.body);
    }
    res.redirect(`${this.url}/${this.category.id}`);
  }
}

module.exports = CategoryFieldList;