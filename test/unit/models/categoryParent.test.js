const { expect } = require('test/unit/util/chai');
const CategoryParent = require('models/categoryParent');
const { INTEGER, BOOLEAN } = require('sequelize');

describe('models/categoryParent', () => {
  it('called CategoryParent.init with the correct parameters', () => {
    expect(CategoryParent.init).to.have.been.calledWith({
      categoryId: {
        type: INTEGER,
        field: "category_id"
      },
      parentCategoryId: {
        type: INTEGER,
        field: "parent_category_id"
      },
      isRequired: {
        type: BOOLEAN,
        field: "is_required"
      }
    });
  });
});
