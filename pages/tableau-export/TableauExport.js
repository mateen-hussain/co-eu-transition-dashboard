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
const Project = require('models/project');
const moment = require('moment');

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
    return this.req.params && this.req.params.type === 'projects';
  }

  async addParents(entity, entityObject) {
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

      const name = parentEntity.entityFieldEntries.find(entityFieldEntry => {
        return entityFieldEntry.categoryField.name === 'name';
      });

      entityObject[parentEntity.category.name] = name.value;

      if(parentEntity.parents.length) {
        await this.addParents(parentEntity, entityObject);
      }
    }
  }

  async getEntitiesFlatStructure(startingCategory) {
    const entities = await Entity.findAll({
      where: {
        categoryId: startingCategory.id
      },
      include: [{
        model: EntityFieldEntry,
        include: CategoryField
      }, {
        model: Entity,
        as: 'parents'
      }]
    });

    const entityObjects = [];

    for(const entity of entities) {
      const entityObject = entity.entityFieldEntries.reduce((object, entityFieldEntry) => {
        object[entityFieldEntry.categoryField.displayName] = entityFieldEntry.value;
        return object;
      }, {});

      entityObject['Public ID'] = entity.publicId;

      if(entity.parents.length) {
        await this.addParents(entity, entityObject);
      }

      entityObjects.push(entityObject);
    }

    return entityObjects;
  }

  async exportMeasures(req, res) {
    const measuresCategory = await Category.findOne({
      where: {
        name: 'Measure'
      }
    });

    const data = await this.getEntitiesFlatStructure(measuresCategory);

    this.responseAsCSV(data, res);
  }

  async mergeProjectsWithEntities(entities) {
    const dao = new DAO({
      sequelize: sequelize
    });
    const projectFieldDefinitions = await Project.fieldDefinitions();

    const projectIds = entities.map(d => d['Public ID']);
    const projects = await dao.getAllData(this.id, {
      uid: projectIds
    });

    for(const entity of entities) {
      const project = projects.find(project => entity['Public ID'] === project.uid);

      if(project) {
        projectFieldDefinitions.forEach(field => {
          if(project[field.name]) {
            entity[`Project ${field.displayName}`] = project[field.name];
          }
        });

        project.projectFieldEntries.forEach(field => {
          entity[`Project ${field.projectField.displayName}`] = field.value;
        });
      }
    }

    return entities;
  }

  async exportProjects(req, res) {
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
      return await this.exportProjects(req, res);
    }

    return res.sendStatus(METHOD_NOT_ALLOWED);
  }

  async postRequest(req, res) {
    res.sendStatus(METHOD_NOT_ALLOWED);
  }
}


module.exports = TableauExport;