const Page = require('core/pages/page');
const { paths } = require('config');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const Category = require('models/category');
const CategoryField = require('models/categoryField');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const { Parser } = require('json2csv');
const sequelize = require('services/sequelize');
const DAO = require('services/dao');
const Milestone = require('models/milestone');
const moment = require('moment');
const cloneDeep = require('lodash/cloneDeep');

class TableauExport extends Page {
  get url() {
    return paths.tableauExport;
  }

  get pathToBind() {
    return `${this.url}/:type`;
  }

  get exportingMeasures() {
    return this.req.params && this.req.params.type === 'measures';
  }

  get exportingProjects() {
    return this.req.params && this.req.params.type === 'projects-milestones';
  }

  get exportingCommunications() {
    return this.req.params && this.req.params.type === 'communications';
  }

  async addParents(entity, entityFieldMap, replaceArraysWithNumberedKeyValues = true) {
    for(const parent of entity.parents) {
      const parentEntity = await Entity.findOne({
        where: {
          id: parent.id
        },
        include: [{
          model: EntityFieldEntry,
          include: CategoryField
        }, {
          model: Entity,
          as: 'parents'
        }, {
          model: Category
        }]
      });

      entityFieldMap[parentEntity.category.name] = entityFieldMap[parentEntity.category.name] || [];

      const name = parentEntity.entityFieldEntries.find(entityFieldEntry => {
        return entityFieldEntry.categoryField.name === 'name';
      });

      if(!entityFieldMap[parentEntity.category.name].includes(name.value)){
        entityFieldMap[parentEntity.category.name].push(name.value);
      }

      if(parentEntity.parents.length) {
        await this.addParents(parentEntity, entityFieldMap, false);
      }
    }

    if(replaceArraysWithNumberedKeyValues){
      Object.keys(entityFieldMap).forEach(key => {
        const value = entityFieldMap[key];
        if(Array.isArray(value)) {
          value.reverse().forEach((valueItem, index) => {
            entityFieldMap[`${key} - ${index + 1}`] = valueItem;
          });
          delete entityFieldMap[key];
        }
      });
    }
  }

  async getEntitiesFlatStructure(startingCategory) {
    const entities = await Entity.findAll({
      where: {
        categoryId: startingCategory.id
      },
      include: [{
        model: EntityFieldEntry,
        include: {
          model: CategoryField,
          where: { isActive: true }
        }
      }, {
        model: Entity,
        as: 'parents'
      }]
    });

    const entityFieldMaps = [];

    for(const entity of entities) {
      const entityFieldMap = entity.entityFieldEntries.reduce((object, entityFieldEntry) => {
        object[entityFieldEntry.categoryField.displayName] = entityFieldEntry.value;
        return object;
      }, {});

      entityFieldMap['Public ID'] = entity.publicId;

      if(entity.parents.length) {
        await this.addParents(entity, entityFieldMap);
      }

      entityFieldMaps.push(entityFieldMap);
    }

    return entityFieldMaps;
  }

  async exportMeasures(req, res) {
    const measuresCategory = await Category.findOne({
      where: {
        name: 'Measure'
      }
    });

    let data = await this.getEntitiesFlatStructure(measuresCategory);

    data = data.filter(d => {
      if (d.Filter && d.Filter === 'RAYG') {
        return false;
      }
      return true;
    });

    this.responseAsCSV(data, res);
  }

  async exportCommunications(req, res) {
    const measuresCategory = await Category.findOne({
      where: {
        name: 'Communication'
      }
    });

    const data = await this.getEntitiesFlatStructure(measuresCategory);

    this.responseAsCSV(data, res);
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

  async exportProjectsMilestones(req, res) {
    const projectsCategory = await Category.findOne({
      where: {
        name: 'Project'
      }
    });

    const entities = await this.getEntitiesFlatStructure(projectsCategory);
    const entitiesWithProjects = await this.mergeProjectsWithEntities(entities);

    this.responseAsCSV(entitiesWithProjects, res);
  }

  responseAsCSV(data, res) {
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    res.set('Cache-Control', 'public, max-age=0');
    res.attachment(`${moment().format('YYYY.MM.DD')}_${this.req.params.type}.csv`);
    res.status(200);
    res.send(csv);
  }

  async getRequest(req, res) {
    if(this.exportingMeasures) {
      return await this.exportMeasures(req, res);
    } else if(this.exportingProjects) {
      return await this.exportProjectsMilestones(req, res);
    } else if(this.exportingCommunications) {
      return await this.exportCommunications(req, res);
    }

    return res.sendStatus(METHOD_NOT_ALLOWED);
  }

  async postRequest(req, res) {
    res.sendStatus(METHOD_NOT_ALLOWED);
  }
}


module.exports = TableauExport;