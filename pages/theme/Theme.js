/* eslint-disable no-prototype-builtins */
const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const config = require('config');
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
const { cache } = require('services/nodeCache');

const rags = ['red', 'amber', 'yellow', 'green'];

class Theme extends Page {
  static get isEnabled() {
    return config.features.transitionReadinessTheme;
  }

  get url() {
    return paths.transitionReadinessThemeDetail;
  }

  get pathToBind() {
    return `${this.url}/:theme/:statement?/:selectedPublicId?`;
  }

  get middleware() {
    return [
      ...authentication.protect(['viewer'])
    ];
  }

  async getIframeUrl(entity) {
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
      break;
    case 'Communication':
      workbook = 'Comms';
      view = 'Comms';
      appendUrl = `?Comms%20ID=${entity.commsId}`;
      break;
    case 'Project':
      workbook = 'HMG';
      view = 'Milestones';
      appendUrl = `?Milestone%20UID=${entity.publicId}`;
      break;
    }

    let url;
    try {
      url = await tableau.getTableauUrl(this.req.user, workbook, view);
    } catch (error) {
      logger.error(`Error from tableau: ${error}`);
      return { error: 'Error from tableau' };
    }

    url += appendUrl;

    return { url };
  }

  mapProjectToEntity(milestoneFieldDefinitions, projectFieldDefinitions, entityFieldMap, project) {
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
        date: milestone.date
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

  applyRagRollups(entity) {
    let color = '';

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
      entity.children.forEach(this.applyRagRollups.bind(this));
      return color;
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
      const colors = entity.children.map(this.applyRagRollups.bind(this));

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

  applyActiveItems(selectedPublicId) {
    return (entity) => {
      entity.active = false;

      if(entity.children) {
        const isActive = entity.children.find(this.applyActiveItems(selectedPublicId));
        if(isActive) {
          entity.active = true;
        }
      } else if (entity.publicId === selectedPublicId) {
        entity.active = true;
      }

      return entity.active;
    }
  }

  filterEntitiesByCategoryId(entities, categoryId) {
    for (var i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i];

      if(entity.children) {
        this.filterEntitiesByCategoryId(entity.children, categoryId);

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

      entity.link = `${this.url}/${this.req.params.theme}/${this.req.params.statement}/${entity.publicId}`;
    }
  }

  async mapProjectsToEntities(entitesInHierarchy) {
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

    const projects = await dao.getAllData(undefined, { uid: projectUids });

    const mapProjectsToEntites = (entity) => {
      if(entity.children) {
        return entity.children.forEach(mapProjectsToEntites);
      }

      if(entity.categoryId === projectsCategory.id) {
        const project = projects.find(project => project.uid === entity.publicId);
        if(!project) {
          throw new Error(`Cannot find project with UID ${entity.publicId}`);
        }
        this.mapProjectToEntity(milestoneFieldDefinitions, projectFieldDefinitions, entity, project);
        entity.isLastExpandable = true;
      }
    }

    mapProjectsToEntites(entitesInHierarchy);
  }

  sortById(entity, property) {
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
  }

  async createEntityHierarchy(topLevelEntityPublicId) {
    const cached = cache.get(`entityHierarchy-${topLevelEntityPublicId}`);
    if(cached) {
      return JSON.parse(cached);
    }

    const result = await Entity.findAll({
      include: [{
        attributes: ['name'],
        model: Category
      }, {
        // attributes: ['id'],
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


    let allEntities = [];
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

      allEntities.push(finalEntity);
    });

    if(!allEntities.length) {
      throw new Error('No entited found in database');
    }

    const topLevelEntity = allEntities.find(entity => entity.publicId === topLevelEntityPublicId);
    if(!topLevelEntity) {
      throw new Error(`Cannot find entity with Public Id ${topLevelEntityPublicId}`);
    }

    const mapEntityChildren = entity => {
      const entityFieldMap = cloneDeep(entity.dataValues);
      delete entityFieldMap.children;
      delete entityFieldMap.entityFieldEntries;

      // map entity field values to object
      entity.entityFieldEntries.forEach(entityFieldEntry => {
        entityFieldMap[entityFieldEntry.categoryField.name] = entityFieldEntry.value;
      }, {});

      if(entityFieldMap.groupDescription) {
        entityFieldMap.name = entityFieldMap.groupDescription;
      }

      if(entity.children.length) {
        entityFieldMap.children = [];
        // assign and map children entities
        entity.children.forEach(childEntity => {
          const childEntityWithFieldValues = allEntities.find(entity => entity.id === childEntity.id);
          if(!childEntityWithFieldValues) {
            throw new Error(`Cannot find entity with Public Id ${childEntity.publicId}`);
          }

          const childEntityWithFieldValuesAndMappedChildren = mapEntityChildren(childEntityWithFieldValues);
          entityFieldMap.children.push(childEntityWithFieldValuesAndMappedChildren);
        });

        const isMeasure = entityFieldMap.children.find(entity => entity.category.name === "Measure");
        if(isMeasure) {
          entityFieldMap.children = entityFieldMap.children.filter(entity => entity.filter === 'RAYG');
        }
      }

      return entityFieldMap;
    };

    const entitesInHierarchy = mapEntityChildren(topLevelEntity);

    await this.mapProjectsToEntities(entitesInHierarchy);

    cache.set(`entityHierarchy-${topLevelEntityPublicId}`, JSON.stringify(entitesInHierarchy));

    return entitesInHierarchy;
  }

  async constructTopLevelCategories() {
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

  applyUIFlags(entity) {
    if (entity.children && entity.children.length && !entity.children[0].children) {
      return entity.isLastExpandable = true;
    } else if(entity.children) {
      entity.children.forEach(this.applyUIFlags.bind(this));
    }
  }

  groupById(entity) {
    if(entity.children && entity.children.length && entity.children[0].groupID) {
      this.sortById(entity, 'groupID');
    } else if(entity.children && entity.children.length && entity.children[0].commsId) {
      this.sortById(entity, 'commsId');
    } else if(entity.children) {
      entity.children.forEach(this.groupById.bind(this));
    }
  }

  async subOutcomeStatementsAndDatas(topLevelEntity) {
    let entities = [];

    try {
      if(!topLevelEntity.children) {
        return entities;
      }

      entities = await this.constructTopLevelCategories();

      // sort all entites into respective categories i.e. Empirical, Comms, HMG Delivery
      entities.forEach(entity => {
        const topLevelEntityClone = cloneDeep(topLevelEntity);
        this.filterEntitiesByCategoryId(topLevelEntityClone.children, entity.categoryId);
        entity.children = topLevelEntityClone.children;
      });

      // remove any categories without children
      entities = entities.filter(data => data.children.length);

      entities.forEach(entity => {
        this.applyUIFlags(entity);
        this.groupById(entity);
        this.applyRagRollups(entity);

        this.applyActiveItems(this.req.params.selectedPublicId)(entity);
      });
    } catch (error) {
      logger.error(error);
    }

    return entities;
  }

  async topLevelOutcomeStatements(topLevelEntity) {
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
        this.groupById(entity);
        this.applyRagRollups(entity);

        entity.link = `${this.url}/${this.req.params.theme}/${entity.publicId}`;

        delete entity.children;

        this.applyActiveItems(this.req.params.statement)(entity);
      });

    } catch (error) {
      logger.error(error);
    }

    return entities;
  }

  findSelected(item, entity) {
    if(item) {
      return item;
    }
    if(entity.active && entity.children) {
      return entity.children.reduce(this.findSelected.bind(this), item);
    } else if(entity.active) {
      return entity;
    }
    return item;
  }

  async data() {
    const theme = await this.createEntityHierarchy(this.req.params.theme);

    const topLevelOutcomeStatements = await this.topLevelOutcomeStatements(cloneDeep(theme));

    let subOutcomeStatementsAndDatas = [];
    if (this.req.params.statement) {
      const topLevelSelectedStatment = cloneDeep(theme).children
        .find(entity => entity.publicId === this.req.params.statement);
      if(!topLevelSelectedStatment) {
        throw new Error(`Cannot find entity with Public Id ${this.req.params.statement}`);
      }
      subOutcomeStatementsAndDatas = await this.subOutcomeStatementsAndDatas(topLevelSelectedStatment);
    }

    // set rag information on theme
    const outcomeColors = topLevelOutcomeStatements.map(c => c.color);
    theme.color = rags.find(rag => outcomeColors.includes(rag));

    const selected = subOutcomeStatementsAndDatas.reduce(this.findSelected.bind(this), false);
    const iframeUrl = await this.getIframeUrl(selected);

    return {
      iframeUrl,
      theme,
      topLevelOutcomeStatements,
      subOutcomeStatementsAndDatas
    }
  }
}

module.exports = Theme;
