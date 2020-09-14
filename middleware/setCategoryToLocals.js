const Category = require('models/category');

const setCategoryToLocals = async (req, res, next) => {
  const category = await Category.findOne({
    where: {
      id: req.params.categoryId
    }
  });

  if(!category) {
    throw new Error('Category not found');
  }

  res.locals.category = category;
  next();
};

module.exports = setCategoryToLocals;