const Page = require('core/pages/page');
const { paths } = require('config');
const Category = require('models/category');
const authentication = require('services/authentication');
const flash = require('middleware/flash');

class CategoryList extends Page {
  get url() {
    return paths.admin.categoryList;
  }

  get middleware() {
    return [
      ...authentication.protect(['administrator']),
      flash
    ];
  }

  async getCategories() {
    return await Category.findAll();
  }
}

module.exports = CategoryList;