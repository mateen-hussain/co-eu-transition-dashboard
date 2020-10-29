
const Category = require('models/category');
const CategoryField = require('models/categoryField');
const EntityFieldEntry = require('models/entityFieldEntry');
const logger = require('services/logger');
const uniqWith = require('lodash/uniqWith');

const applyLabelToEntities = (entities) => {
  entities.forEach(entity => {
    if (entity.filter && entity.filterValue) {
      entity.label = `${entity.filter} : ${entity.filterValue}`
    }

    if (entity.filter2 && entity.filterValue2) {
      entity.label2 = `${entity.filter2} : ${entity.filterValue2}`
    }
  })
}

const calculateUiInputs = (measureEntities) => {
  return uniqWith(
    measureEntities,
    (locationA, locationB) => {
      if (locationA.filter && locationA.filter2) {
        return locationA.filterValue === locationB.filterValue && locationA.filterValue2 === locationB.filterValue2
      } else if (locationA.filter) {
        return locationA.filterValue === locationB.filterValue
      } else {
        return locationA.metricID
      }
    }
  );
}

const getEntityFields = async (entityId) => {
  const entityFieldEntries = await EntityFieldEntry.findAll({
    where: { entity_id: entityId },
    include: CategoryField
  });

  if (!entityFieldEntries) {
    logger.error(`EntityFieldEntry export, error finding entityFieldEntries`);
    throw new Error(`EntityFieldEntry export, error finding entityFieldEntries`);
  }

  return entityFieldEntries;
}

const getCategory = async (name) => {
  const category = await Category.findOne({
    where: { name }
  });

  if (!category) {
    logger.error(`Category export, error finding Measure category`);
    throw new Error(`Category export, error finding Measure category`);
  }

  return category;
}

module.exports = {
  applyLabelToEntities,
  calculateUiInputs,
  getEntityFields,
  getCategory
};
