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
const authentication = require('services/authentication');
const { tableauIpWhiteList } = require('middleware/ipWhitelist');

class TableauExport extends Page {
  get url() {
    return paths.tableauExport;
  }

  get middleware() {
    return [
      tableauIpWhiteList,
      ...authentication.protect(['management'])
    ];
  }

  get pathToBind() {
    return `${this.url}/:type/:mode?`;
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

  get showForm() {
    return this.req.params && !this.req.params.mode && this.isValidPageType;
  }

  get exportSchema() {
    return this.req.params && this.req.params.mode === 'schema' && this.isValidPageType;
  }

  get isValidPageType() {
    return this.exportingMeasures || this.exportingProjects || this.exportingCommunications;
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

      let nameEntry;
      let groupDescriptionEntry;


      parentEntity.entityFieldEntries.forEach(entityFieldEntry => {
        if(entityFieldEntry.categoryField.name === 'groupDescription') {
          groupDescriptionEntry = entityFieldEntry;
        }

        if(entityFieldEntry.categoryField.name === 'name') {
          nameEntry = entityFieldEntry;
        }
      });

      const name = groupDescriptionEntry || nameEntry;

      if(!entityFieldMap[parentEntity.category.name].some(item => item.value === name.value)){
        entityFieldMap[parentEntity.category.name].push({ value: name.value, type: name.categoryField.type });
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

    const categoryFields = await CategoryField.findAll({
      where: {
        isActive: true,
        categoryId: startingCategory.id
      }
    });

    const entityFieldMaps = [];

    for(const entity of entities) {
      const entityFieldMap = categoryFields.reduce((object, categoryField) => {
        const value = entity.entityFieldEntries.find(fieldEntry => fieldEntry.categoryFieldId == categoryField.id);
        object[categoryField.displayName] = {
          value: value === undefined ? undefined : value.value,
          type: categoryField.type
        }
        return object;
      }, {});

      entityFieldMap['Public ID'] = { value: entity.publicId, type: 'string' };

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

    const data = await this.getEntitiesFlatStructure(measuresCategory);

    return this.exportSchema ? res.json(data[0]) : res.json(data);
  }

  async exportCommunications(req, res) {
    const measuresCategory = await Category.findOne({
      where: {
        name: 'Communication'
      }
    });

    const data = await this.getEntitiesFlatStructure(measuresCategory);

    return this.exportSchema ? res.json(data[0]) : res.json(data);
  }

  async mergeProjectsWithEntities(entities) {
    const dao = new DAO({
      sequelize: sequelize
    });
    const milestoneFieldDefinitions = await Milestone.fieldDefinitions();

    const projectIds = entities.map(d => d['Public ID'].value);
    const projects = await dao.getAllData(this.id, {
      uid: projectIds
    });

    const milestoneDatas = [];

    for(const entity of entities) {
      const project = projects.find(project => entity['Public ID'].value === project.uid);

      if(project) {

        for(const milestone of project.milestones) {
          const milestoneData = cloneDeep(entity);

          milestoneData['Project - Name'] = { value: project.title, type: 'string' };
          milestoneData['Project - UID'] = { value: project.uid, type: 'string' };

          milestoneFieldDefinitions.forEach(field => {
            if(milestone[field.name]) {
              milestoneData[`Milestone - ${field.displayName || field.name}`] = { value:  milestone[field.name], type: 'string' };
            }
          });

          milestone.milestoneFieldEntries.forEach(field => {
            milestoneData[`Milestone - ${field.milestoneField.displayName}`] =  { value: field.value, type: field.milestoneField.type };
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
    const data = await this.mergeProjectsWithEntities(entities);

    return this.exportSchema ? res.json(data[0]) : res.json(data)
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

    if (this.showForm) {
      return super.getRequest(req, res);
    }

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
