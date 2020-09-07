/* eslint-disable no-prototype-builtins */
const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const config = require('config');
const Category = require('models/category');
const CategoryField = require('models/categoryField');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const Project = require('models/project');
const Milestone = require('models/milestone');
const cloneDeep = require('lodash/cloneDeep');
const sequelize = require('services/sequelize');
const DAO = require('services/dao');
const logger = require('services/logger');

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
      ...authentication.protect(['management_overview'])
    ];
  }

  mapProjectToEntity(milestoneFieldDefinitions, projectFieldDefinitions, entityFieldMap, project) {
    entityFieldMap.name = project.title;
    entityFieldMap.hmgConfidence = project.hmgConfidence;

    project.projectFieldEntries.forEach(projectFieldEntry => {
      entityFieldMap[projectFieldEntry.projectField.name] = projectFieldEntry.value
    });

    entityFieldMap.children = project.milestones.map(milestone => {
      const milestoneFieldMap = {
        name: milestone.description,
        publicId: milestone.uid,
        deliveryConfidence: milestone.deliveryConfidence,
        categoryId: entityFieldMap.categoryId
      };

      milestone.milestoneFieldEntries.forEach(milestoneFieldEntry => {
        milestoneFieldMap[milestoneFieldEntry.milestoneField.name] = milestoneFieldEntry.value
      });

      return milestoneFieldMap;
    });
  }

  applyRagRollups(entity) {
    const rags = ['red', 'amber', 'green'];

    let color = '';

    if(entity.hmgConfidence) {
      if (entity.hmgConfidence == 0) {
        color = "red";
      } else if (entity.hmgConfidence == 1 || entity.hmgConfidence == 2) {
        color = "amber";
      } else if (entity.hmgConfidence == 3) {
        color = "green";
      }
      entity.color = color;
      entity.children.forEach(this.applyRagRollups.bind(this));
      return color;
    } else if(entity.deliveryConfidence) {
      if (entity.deliveryConfidence == 0) {
        color = "red";
      } else if (entity.deliveryConfidence == 1 || entity.hmgConfidence == 2) {
        color = "amber";
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
      if (entity.value <= entity.redThreshold) {
        color = "red";
      } else if (entity.value <= entity.aYThreshold) {
        color = "amber";
      } else if (entity.value <= entity.greenThreshold) {
        color = "green";
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
        this.mapProjectToEntity(milestoneFieldDefinitions, projectFieldDefinitions, entity, project);
        entity.isLastExpandable = true;
      }
    }

    mapProjectsToEntites(entitesInHierarchy);
  }

  async createEntityHierarchy(topLevelEntityPublicId) {
    const allEntities = await Entity.findAll({
      include: [{
        model: Entity,
        as: 'children'
      }, {
        model: Entity,
        as: 'parents'
      }, {
        model: EntityFieldEntry,
        include: {
          model: CategoryField,
          where: { isActive: true }
        }
      }]
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

        // add a useful flag so frontend can change the style of the penultimate hiarchy item
        if(!entityFieldMap.children[0].children) {
          entityFieldMap.isLastExpandable = true;
        }
      }

      return entityFieldMap;
    };

    const entitesInHierarchy = mapEntityChildren(topLevelEntity);

    await this.mapProjectsToEntities(entitesInHierarchy);

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

  async subOutcomeStatementsAndDatas(topLevelEntity) {
    let datas = [];

    try {
      if(!topLevelEntity.children) {
        return datas;
      }

      datas = await this.constructTopLevelCategories();

      // sort all entites into respective categories i.e. Empirical, Comms, HMG Delivery
      datas.forEach(data => {
        const topLevelEntityClone = cloneDeep(topLevelEntity);
        this.filterEntitiesByCategoryId(topLevelEntityClone.children, data.categoryId);
        data.children = topLevelEntityClone.children;
      });

      // remove any categories without children
      datas = datas.filter(data => data.children.length);

      // apply active items
      datas.forEach(this.applyActiveItems(this.req.params.selectedPublicId));

      // apply rag roll ups
      datas.forEach(this.applyRagRollups.bind(this));
    } catch (error) {
      logger.error(error);
    }

    return datas;
  }

  async topLevelOutcomeStatements(topLevelEntity) {
    let datas = [];

    try {
      datas = topLevelEntity.children;

      // remove any categories without children
      datas = datas.filter(data => data.children.length);

      // remove any entities that have more than one parent
      datas = datas.filter(data => data.parents.length <= 1);

      // apply rag roll ups
      datas.forEach(this.applyRagRollups.bind(this));

      // remove all children for top level outcome statements
      datas = datas.map(entity => {
        delete entity.children;
        return entity;
      });

      // apply active items
      datas.forEach(this.applyActiveItems(this.req.params.statement));

      datas.forEach(data => {
        data.link = `${this.url}/${this.req.params.theme}/${data.publicId}`;
      });
    } catch (error) {
      logger.error(error);
    }

    return datas;
  }

  async data() {
    const topLevelEntityTheme = await this.createEntityHierarchy(this.req.params.theme);

    const topLevelOutcomeStatements = await this.topLevelOutcomeStatements(cloneDeep(topLevelEntityTheme));

    let subOutcomeStatementsAndDatas = [];
    if (this.req.params.statement) {
      const topLevelSelectedStatment = cloneDeep(topLevelEntityTheme).children.find(entity => entity.publicId === this.req.params.statement);
      if(!topLevelSelectedStatment) {
        throw new Error(`Cannot find entity with Public Id ${this.req.params.statement}`);
      }
      subOutcomeStatementsAndDatas = await this.subOutcomeStatementsAndDatas(topLevelSelectedStatment);
    }

    return {
      topLevelOutcomeStatements,
      subOutcomeStatementsAndDatas
    }
  }


}

module.exports = Theme;