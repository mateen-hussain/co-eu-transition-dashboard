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
    entityFieldMap.hMGConfidence = 3;

    entityFieldMap.children = project.milestones.map(milestone => {
      const milestoneFieldMap = {
        name: milestone.description,
        publicId: milestone.uid,
        deliveryConfidence: 3,
        categoryId: entityFieldMap.categoryId
      };

      return milestoneFieldMap;
    });
  }

  async mergeProjectsWithEntities(entities) {
    const dao = new DAO({
      sequelize: sequelize
    });
    const milestoneFieldDefinitions = await Milestone.fieldDefinitions();

    const projectIds = entities.map(d => d['Public ID']);
    const projects = await dao.getAllData(this.id, {
      uid: projectIds
    });

    const milestoneDatas = [];

    for(const entity of entities) {
      const project = projects.find(project => entity['Public ID'] === project.uid);

      if(project) {
        for(const milestone of project.milestones) {
          const milestoneData = cloneDeep(entity);

          milestoneData['Project - Name'] = project.title;
          milestoneData['Project - UID'] = project.uid;

          milestoneFieldDefinitions.forEach(field => {
            if(milestone[field.name]) {
              milestoneData[`Milestone - ${field.displayName || field.name}`] = milestone[field.name];
            }
          });

          milestone.milestoneFieldEntries.forEach(field => {
            milestoneData[`Milestone - ${field.milestoneField.displayName}`] = field.value;
          });

          milestoneDatas.push(milestoneData);
        }
      }
    }

    return milestoneDatas;
  }

  applyRagRollups(entity) {
    const rags = ['red', 'amber', 'green'];

    let color = '';

    if(entity.hMGConfidence) {
      if (entity.hMGConfidence === 1) {
        color = "red";
      } else if (entity.hMGConfidence === 2) {
        color = "amber";
      } else if (entity.hMGConfidence === 3) {
        color = "green";
      }
      entity.color = color || '';
      entity.children.forEach(this.applyRagRollups.bind(this));
      return color;
    } else if(entity.deliveryConfidence) {
      if (entity.deliveryConfidence === 1) {
        color = "red";
      } else if (entity.deliveryConfidence === 2) {
        color = "amber";
      } else if (entity.deliveryConfidence === 3) {
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

  async createEntityHierarchy(topLevelEntityPublicId) {
    const dao = new DAO({
      sequelize: sequelize
    });
    const milestoneFieldDefinitions = await Milestone.fieldDefinitions();
    const projectFieldDefinitions = await Project.fieldDefinitions();

    const allEntities = await Entity.findAll({
      include: [{
        model: Entity,
        as: 'children'
      }, {
        model: EntityFieldEntry,
        include: {
          model: CategoryField,
          where: { isActive: true }
        }
      }]
    });

    const projects = await dao.getAllData();
    const projectsUids = projects.map(project => project.uid);

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

        // add a usesfull flag so frontend can change the style of the penaltimate hiarchy item
        if(!entityFieldMap.children[0].children) {
          entityFieldMap.isLastExpandable = true;
        }
      } else if(projectsUids.includes(entity.publicId)) {
        const project = projects.find(project => project.uid === entity.publicId);
        this.mapProjectToEntity(milestoneFieldDefinitions, projectFieldDefinitions, entityFieldMap, project);
        entityFieldMap.isLastExpandable = true;
      }

      return entityFieldMap;
    };

    return mapEntityChildren(topLevelEntity);
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

  async subOutcomeMeasures() {
    let datas = [];

    if(!this.req.params.statement) {
      return datas;
    }

    try {
      const topLevelEntity = await this.createEntityHierarchy(this.req.params.statement);
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

      // apply active items
      datas.forEach(this.applyActiveItems(this.req.params.selectedPublicId));

      // apply rag roll ups
      datas.forEach(this.applyRagRollups.bind(this));
    } catch (error) {
      logger.error(error);
    }

    return datas;
  }

  async topLevelOutcomeStatements() {
    let datas = [];

    if(!this.req.params.theme) {
      return datas;
    }

    try {
      const topLevelEntity = await this.createEntityHierarchy(this.req.params.theme);
      datas = topLevelEntity.children;

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
}

module.exports = Theme;