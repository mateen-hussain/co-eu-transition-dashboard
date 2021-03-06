/* eslint-disable no-prototype-builtins */
const Category = require('models/category');
const CategoryField = require('models/categoryField');
const Entity = require('models/entity');
const EntityParent = require('models/entityParent');
const EntityFieldEntry = require('models/entityFieldEntry');
const Project = require('models/project');
const Milestone = require('models/milestone');
const cloneDeep = require('lodash/cloneDeep');
const sequelize = require('services/sequelize');
const DAO = require('services/dao');
const logger = require('services/logger');
const groupBy = require('lodash/groupBy');
const moment = require('moment');
const tableau = require('services/tableau');
const cache = require('services/cache');
const config = require('config');
const uniq = require('lodash/uniq');

const rags = ['red', 'amber', 'yellow', 'green'];

const getIframeUrl = async (req, entity) => {
  if(!entity) {
    return {};
  }

  let workbook = '';
  let view = '';
  let appendUrl = '';

  switch(entity.category.name) {
  case 'Measure':
    workbook = 'Readiness';
    view = entity.groupID;
    if(entity.commentsOnly == 'Yes') {
      workbook = 'Placeholders';
      view = 'Placeholder';
      appendUrl = `?Group%20ID=${entity.groupID}`;
    }
    break;
  case 'Communication':
    workbook = 'Comms';
    view = 'Comms';
    appendUrl = `?Comms%20ID=${entity.commsId}`;
    break;
  case 'Project':
    workbook = 'HMG';
    view = 'Milestones';
    appendUrl = `?Milestone%20-%20uid=${entity.publicId}`;
    break;
  }

  workbook = `${config.services.tableau.prependUrl}${workbook}`;

  let url;
  try {
    url = await tableau.getTableauUrl(req.user, workbook, view);
  } catch (error) {
    logger.error(`Error from tableau: ${error}`);
    return { error: 'Error from tableau' };
  }

  url += appendUrl;

  return { url };
}

const mapProjectToEntity = (milestoneFieldDefinitions, projectFieldDefinitions, entityFieldMap, project) => {
  entityFieldMap.name = `${project.departmentName} - ${project.title}`;
  entityFieldMap.hmgConfidence = project.hmgConfidence;

  project.projectFieldEntries.forEach(projectFieldEntry => {
    entityFieldMap[projectFieldEntry.projectField.name] = projectFieldEntry.value
  });

  entityFieldMap.children = project.milestones.map(milestone => {
    const milestoneFieldMap = {
      name: milestone.description,
      publicId: milestone.uid,
      deliveryConfidence: milestone.deliveryConfidence,
      categoryId: entityFieldMap.categoryId,
      date: milestone.date,
      complete: milestone.complete,
    };

    milestone.milestoneFieldEntries.forEach(milestoneFieldEntry => {
      milestoneFieldMap[milestoneFieldEntry.milestoneField.name] = milestoneFieldEntry.value
    });

    milestoneFieldMap.category = entityFieldMap.category;

    return milestoneFieldMap;
  });

  entityFieldMap.children = entityFieldMap.children
    .sort((a, b) => {
      return moment(a.date, 'DD/MM/YYYY').valueOf() - moment(b.date, 'DD/MM/YYYY').valueOf();
    });
}

const applyRagRollups = (entity) => {
  let color = '';

  // entity is a project
  if (entity.hasOwnProperty('hmgConfidence')) {
    if (entity.hmgConfidence == 0) {
      color = "red";
    } else if (entity.hmgConfidence == 1) {
      color = "amber";
    } else if (entity.hmgConfidence == 2) {
      color = "yellow";
    } else if (entity.hmgConfidence == 3) {
      color = "green";
    }

    entity.color = color;
    entity.children.forEach(applyRagRollups);
    return color;

  // entity is a milestone
  // do not roll up status to project
  } else if (entity.hasOwnProperty('deliveryConfidence')) {
    if (entity.deliveryConfidence == 0) {
      color = "red";
    } else if (entity.deliveryConfidence == 1) {
      color = "amber";
    } else if (entity.deliveryConfidence == 2) {
      color = "yellow";
    } else if (entity.deliveryConfidence == 3) {
      color = "green";
    }

    entity.color = color || '';
    return color;
  }

  if(entity.children) {
    const colors = entity.children.map(applyRagRollups);

    color = rags.find(rag => colors.includes(rag));
    entity.color = color || '';

    return color;
  }

  if(entity.hasOwnProperty('redThreshold') &&
    entity.hasOwnProperty('aYThreshold') &&
    entity.hasOwnProperty('greenThreshold') &&
    entity.hasOwnProperty('value')) {
    if (parseInt(entity.value) >= parseInt(entity.greenThreshold)) {
      color = "green";
    } else if (parseInt(entity.value) > parseInt(entity.aYThreshold)) {
      color = "yellow";
    } else if (parseInt(entity.value) > parseInt(entity.redThreshold)) {
      color = "amber";
    } else {
      color = "red";
    }
  }

  entity.color = color;
  return color;
}

const applyActiveItems = (selectedPublicId) => {
  return (entity) => {
    entity.active = false;

    if(entity.children) {
      const isActive = entity.children.find(applyActiveItems(selectedPublicId));
      if(isActive) {
        entity.active = true;
      }
    } else if (entity.publicId === selectedPublicId) {
      entity.active = true;
    }

    return entity.active;
  }
}

const filterEntitiesByCategoryId = (pageUrl, req, entities, categoryId) => {
  for (var i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];

    if(entity.children) {
      filterEntitiesByCategoryId(pageUrl,req, entity.children, categoryId);

      // remove ghost categories
      if(!entity.children.length) {
        entities.splice(i, 1);
      }

      continue;
    }

    if(entity.categoryId !== categoryId) {
      entities.splice(i, 1);
      continue;
    }

    entity.link = `${pageUrl}/${req.params.theme}/${req.params.statement}/${entity.publicId}`;
  }
}

const mapProjectsToEntities = async (entitesInHierarchy) => {
  const projectsCategory = await Category.findOne({
    where: { name: 'Project' }
  });

  if(!projectsCategory) {
    throw new Error('Cannot find projects category');
  }

  const dao = new DAO({
    sequelize: sequelize
  });
  const milestoneFieldDefinitions = await Milestone.fieldDefinitions();
  const projectFieldDefinitions = await Project.fieldDefinitions();

  const getProjectUid = (uids, entity) => {
    if(entity.children) {
      return entity.children.reduce(getProjectUid, uids);
    }

    if(entity.categoryId === projectsCategory.id) {
      uids.push(entity.publicId);
    }

    return uids;
  }

  const projectUids = entitesInHierarchy.children.reduce(getProjectUid, []);
  if(!projectUids.length) {
    return;
  }

  const projects = await dao.getAllData(undefined, {
    uid: projectUids,
    complete: ['Yes', 'No'] // Only include milestones that are completed Yes or No ( dont include decommissioned milestones )
  });

  const mapProjectsToEntites = (entity) => {
    if(entity.children) {
      entity.children.forEach(mapProjectsToEntites);

      // remove projects without milestones
      entity.children = entity.children.filter(entity => {
        const isProject = entity.categoryId === projectsCategory.id;
        if(isProject) {
          return entity.children && entity.children.length;
        }
        return true;
      });

      return entity;
    }

    if(entity.categoryId === projectsCategory.id) {
      const project = projects.find(project => project.uid === entity.publicId);
      if(project) {
        mapProjectToEntity(milestoneFieldDefinitions, projectFieldDefinitions, entity, project);
        entity.isLastExpandable = true;
      }
    }
  };

  mapProjectsToEntites(entitesInHierarchy);
}

const sortById = (entity, property) => {
  const childrenGrouped = groupBy(entity.children, child => child[property]);

  if(childrenGrouped) {
    Object.keys(childrenGrouped).forEach(groupKey => {
      let sorted;

      if(property === 'groupID') {
        sorted = childrenGrouped[groupKey]
          .sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
      } else {
        sorted = childrenGrouped[groupKey]
          .sort((a, b) => a.value - b.value);
      }

      // only show the latest metric details
      entity.children = entity.children.filter(child => {
        if(child[property] && child[property] === groupKey) {
          return child.id === sorted[0].id;
        }
        return true;
      });
    })
  }
};

// We can only append total value of the measure to the description if it is
// the only measure in the group and there are no filter values. This is because
//we cannot programatically decide which numbere to append if the measure is part
// of a group or has multiple values by way of filters
const canAppendValueToDescription = (allEntities, entity) => {
  // only append the value to the description if the unit is none
  const unitIsNone = entity.unit !== 'none';

  // get all measures in group except RAYG rows
  const measuresInGroup = allEntities.filter(allEntity => {
    return allEntity.groupID == entity.groupID && allEntity.filter !== 'RAYG';
  });

  // do any of the measures in this group have a filter
  const doesNotHaveFilter = !measuresInGroup.find(measure => !!measure.filter);

  // ensure there is only one measure in the group
  const metricIds = measuresInGroup.map(measure => measure.metricID);
  const uniqMetricIds = uniq(metricIds);
  const isOnlyMeasureInGroup = uniqMetricIds.length === 1;

  return unitIsNone && doesNotHaveFilter && isOnlyMeasureInGroup;
};

const mapEntityChildren = (allEntities, entity) => {
  const entityFieldMap = cloneDeep(entity.dataValues);
  delete entityFieldMap.children;
  delete entityFieldMap.entityFieldEntries;

  // map entity field values to object
  entity.entityFieldEntries.forEach(entityFieldEntry => {
    entityFieldMap[entityFieldEntry.categoryField.name] = entityFieldEntry.value;
  }, {});

  if(entity.children.length) {
    entityFieldMap.children = [];
    // assign and map children entities
    entity.children.forEach(childEntity => {
      const childEntityWithFieldValues = allEntities.find(entity => entity.id === childEntity.id);
      if(!childEntityWithFieldValues) {
        throw new Error(`Cannot find entity with Public Id ${childEntity.publicId}`);
      }

      const childEntityWithFieldValuesAndMappedChildren = mapEntityChildren(allEntities, childEntityWithFieldValues);
      entityFieldMap.children.push(childEntityWithFieldValuesAndMappedChildren);
    });

    entityFieldMap.children = entityFieldMap.children.filter(entity => {
      // only show measure entities if filter equals RAYG
      const isMeasure = entity.category.name === "Measure";
      if(!isMeasure) {
        return true;
      }
      return entity.filter === 'RAYG';
    });

    // append value to description if a measure and can append value
    entityFieldMap.children = entityFieldMap.children.map(entity => {
      const isMeasure = entity.category.name === "Measure";

      if(isMeasure && canAppendValueToDescription(allEntities, entity)) {
        // if the unit is a percentage append the value to the description as well as a percent symbol, otherwise just append value
        if(entityFieldMap.unit === '%') {
          entity.name = `${entity.groupDescription}: ${entity.value}%`;
        } else {
          entity.name = `${entity.groupDescription}: ${entity.value}`;
        }
      }
      return entity;
    });
  }

  return entityFieldMap;
};

const getAllEntities = async () => {
  const result = await Entity.findAll({
    include: [{
      attributes: ['name'],
      model: Category
    }, {
      model: EntityParent,
      as: 'entityChildren',
      separate: true,
      include: {
        model: Entity,
        as: 'child'
      }
    }, {
      model: EntityParent,
      as: 'entityParents',
      separate: true,
      include: {
        model: Entity,
        as: 'parent'
      }
    }, {
      seperate: true,
      model: EntityFieldEntry,
      include: {
        attributes: ['name'],
        model: CategoryField,
        where: { isActive: true }
      }
    }]
  });

  const allEntities = [];
  result.forEach( entity => {
    let finalEntity = entity;

    finalEntity.children = [];
    if (entity.entityChildren.length) {
      entity.entityChildren.forEach( childEntity => {
        finalEntity.children.push(childEntity.child);
      });
    }
    finalEntity.dataValues.children = finalEntity.children;

    finalEntity.parents = [];
    if (entity.entityParents.length) {
      entity.entityParents.forEach( parentEntity => {
        finalEntity.parents.push(parentEntity.parent);
      });
    }
    finalEntity.dataValues.parents = finalEntity.parents;

    entity.entityFieldEntries.forEach(entityFieldEntry => {
      finalEntity[entityFieldEntry.categoryField.name] = entityFieldEntry.value;
    }, {});

    allEntities.push(finalEntity);
  });

  return allEntities;
}

const createEntityHierarchy = async (category) => {
  if(config.features.transitionReadinessCache) {
    const cached = await cache.get(`cache-transition-overview`);
    if(cached) {
      return JSON.parse(cached);
    }
  }

  const allEntities = await getAllEntities();

  if(!allEntities.length) {
    throw new Error('No entited found in database');
  }

  const topLevelEntites = allEntities.filter(entity => entity.categoryId === category.id)

  let entitesInHierarchy = [];
  for(const topLevelEntity of topLevelEntites) {
    const entitesMapped = mapEntityChildren(allEntities, topLevelEntity);
    if(entitesMapped && entitesMapped.children && entitesMapped.children.length) {
      await mapProjectsToEntities(entitesMapped);
    }
    entitesInHierarchy.push(entitesMapped)
  }

  await cache.set(`cache-transition-overview`, JSON.stringify(entitesInHierarchy), moment().endOf('day'));

  return entitesInHierarchy;
}

const createEntityHierarchyForTheme = async (topLevelEntityPublicId) => {
  if(config.features.transitionReadinessCache) {
    const cached = await cache.get(`cache-transition-${topLevelEntityPublicId}`);
    if(cached) {
      return JSON.parse(cached);
    }
  }

  const allEntities = await getAllEntities();
  if(!allEntities.length) {
    throw new Error('No entited found in database');
  }

  const topLevelEntity = allEntities.find(entity => entity.publicId === topLevelEntityPublicId);
  if(!topLevelEntity) {
    throw new Error(`Cannot find entity with Public Id ${topLevelEntityPublicId}`);
  }

  const topLevelEntityMapped = mapEntityChildren(allEntities, topLevelEntity);
  await mapProjectsToEntities(topLevelEntityMapped);

  await cache.set(`cache-transition-${topLevelEntityPublicId}`, JSON.stringify(topLevelEntityMapped), moment().endOf('day'));

  return topLevelEntityMapped;
}

const constructTopLevelCategories = async () => {
  const categories = await Category.findAll();

  const measuresCategory = categories.find(category => category.name === 'Measure');
  if(!measuresCategory) {
    throw new Error('Cannot find measures category');
  }

  const communicationCategory = categories.find(category => category.name === 'Communication');
  if(!communicationCategory) {
    return logger.error('Cannot find communication category');
  }

  const projectCategory = categories.find(category => category.name === 'Project');
  if(!projectCategory) {
    throw new Error('Cannot find projectCategory category');
  }

  return [{
    name: "Empirical",
    categoryId: measuresCategory.id
  },{
    name: "Comms",
    categoryId: communicationCategory.id
  },{
    name: "HMG Delivery",
    categoryId: projectCategory.id
  }];
}

const applyUIFlags = (entity) => {
  if (entity.children && entity.children.length && !entity.children[0].children) {
    return entity.isLastExpandable = true;
  } else if(entity.children) {
    entity.children.forEach(applyUIFlags);
  }
}

const groupById = (entity) => {
  if(entity.children && entity.children.length && entity.children[0].groupID) {
    sortById(entity, 'groupID');
  } else if(entity.children && entity.children.length && entity.children[0].commsId) {
    sortById(entity, 'commsId');
  } else if(entity.children) {
    entity.children.forEach(groupById);
  }
}

const getSubOutcomeStatementsAndDatas = async (pageUrl, req, topLevelEntity) => {
  let entities = [];

  try {
    if(!topLevelEntity.children) {
      return entities;
    }

    entities = await constructTopLevelCategories();

    // sort all entites into respective categories i.e. Empirical, Comms, HMG Delivery
    entities.forEach(entity => {
      const topLevelEntityClone = cloneDeep(topLevelEntity);
      filterEntitiesByCategoryId(pageUrl, req, topLevelEntityClone.children, entity.categoryId);
      entity.children = topLevelEntityClone.children;
    });

    // remove any categories without children
    entities = entities.filter(data => data.children.length);

    entities.forEach(entity => {
      applyUIFlags(entity);
      groupById(entity);
      applyRagRollups(entity);

      applyActiveItems(req.params.selectedPublicId)(entity);
    });
  } catch (error) {
    logger.error(error);
  }

  return entities;
}

const getTopLevelOutcomeStatements = async (pageUrl, req, topLevelEntity) => {
  const statementCategory = await Category.findOne({
    where: { name: 'Statement' }
  });

  let entities = topLevelEntity.children;

  try {
    const filterChildren = (entities = []) => {
      for (var i = entities.length - 1; i >= 0; i--) {
        const entity = entities[i];

        if(entity.children) {
          filterChildren(entity.children);

          if(!entity.children.length) {
            entities.splice(i, 1);
          }
          continue;
        }

        if(entity.categoryId === statementCategory.id) {
          entities.splice(i, 1);
        }
      }
    };

    entities.forEach(entity => {
      if(entity.children) {
        filterChildren(entity.children);
      }
    });

    entities = entities.filter(entity => {
      const hasChildren = entity.children && entity.children.length;
      const hasOnlyParentOrLess = entity.parents.length <= 1;
      return hasChildren && hasOnlyParentOrLess;
    });

    entities.forEach(entity => {
      groupById(entity);
      applyRagRollups(entity);

      entity.link = `${pageUrl}/${req.params.theme}/${entity.publicId}`;

      delete entity.children;

      applyActiveItems(req.params.statement)(entity);
    });

  } catch (error) {
    logger.error(error);
  }

  return entities;
}

const findSelected = (item, entity) => {
  if(item) {
    return item;
  }
  if(entity.active && entity.children) {
    return entity.children.reduce(findSelected, item);
  } else if(entity.active) {
    return entity;
  }
  return item;
}

const themeDetail = async (pageUrl, req) => {
  const theme = await createEntityHierarchyForTheme(req.params.theme);
  const topLevelOutcomeStatements = await getTopLevelOutcomeStatements(pageUrl, req, cloneDeep(theme));

  let subOutcomeStatementsAndDatas = [];
  if (req.params.statement) {
    const topLevelSelectedStatment = cloneDeep(theme).children
      .find(entity => entity.publicId === req.params.statement);
    if(!topLevelSelectedStatment) {
      throw new Error(`Cannot find entity with Public Id ${req.params.statement}`);
    }
    subOutcomeStatementsAndDatas = await getSubOutcomeStatementsAndDatas(pageUrl, req, topLevelSelectedStatment);
  }

  // set rag information on theme
  const outcomeColors = topLevelOutcomeStatements.map(c => c.color);
  theme.color = rags.find(rag => outcomeColors.includes(rag));

  const selected = subOutcomeStatementsAndDatas.reduce(findSelected, false);
  const iframeUrl = await getIframeUrl(req, selected);

  return {
    iframeUrl,
    theme,
    topLevelOutcomeStatements,
    subOutcomeStatementsAndDatas
  }
}

const findEntity = (item, entity) => {
  if(item.found) {
    return item;
  }
  if(entity.publicId === item.publicId) {
    entity.found = true;
    return entity;
  } else if(entity.children) {
    return entity.children.reduce(findEntity, item);
  }
  return item;
}


const findTopLevelOutcomeStatementFromEntity = (statementCategory, allThemes, publicId) => {
  const entity = allThemes.reduce(findEntity, { publicId, found: false });

  const parent = entity.parents.find(parent => parent.categoryId == statementCategory.id);
  if(!parent) {
    return entity;
  } else {
    return findTopLevelOutcomeStatementFromEntity(statementCategory, allThemes, parent.publicId)
  }
};

const overview = async (transitionReadinessThemeDetailLink, headlinePublicIds) => {
  const themeCategory = await Category.findOne({
    where: { name: 'Theme' }
  });

  const statementCategory = await Category.findOne({
    where: { name: 'Statement' }
  });

  const allThemes = await createEntityHierarchy(themeCategory);

  allThemes.forEach(entity => {
    groupById(entity);
    applyRagRollups(entity);
  });

  // set headline Entity link
  const headlineEntites = headlinePublicIds.map(publicId => {
    const entity = allThemes.reduce(findEntity, { publicId, found: false });

    const statement = findTopLevelOutcomeStatementFromEntity(statementCategory, allThemes, publicId);
    const theme = statement.parents.find(parent => parent.categoryId == themeCategory.id);
    const themeDetail = allThemes.reduce(findEntity, { publicId: theme.publicId, found: false });

    entity.theme = themeDetail.name;
    entity.link = `${transitionReadinessThemeDetailLink}/${theme.publicId}/${statement.publicId}/${entity.publicId}`;

    return entity;
  });

  allThemes.forEach(entity => {
    delete entity.entityChildren;
    delete entity.entityParents;
    delete entity.children;
  });

  return {
    allThemes,
    headlineEntites
  }
}

module.exports = {
  themeDetail,
  overview
};
