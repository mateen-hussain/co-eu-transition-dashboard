const Page = require('core/pages/page');
const { paths } = require('config');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const Category = require('models/category');
const CategoryField = require('models/categoryField');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const { Parser } = require('json2csv');

class TableauExport extends Page {
  get url() {
    return paths.tableauExport;
  }

  get pathToBind() {
    return `${this.url}/:type`;
  }

  get exportingMetrics() {
    return this.req.params && this.req.params.type === 'metrics';
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

  async getMetrics() {
    const metricsCategory = await Category.findOne({
      where: {
        name: 'Measure'
      }
    });

    const metricsEntities = await Entity.findAll({
      where: {
        categoryId: metricsCategory.id
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

    for(const entity of metricsEntities) {
      const entityObject = entity.entityFieldEntries.reduce((object, entityFieldEntry) => {
        object[entityFieldEntry.categoryField.displayName] = entityFieldEntry.value;
        return object;
      }, {});

      if(entity.parents.length) {
        await this.addParents(entity, entityObject);
      }

      entityObjects.push(entityObject);
    }

    return entityObjects;
  }

  async exportMetrics(req, res) {
    const data = await this.getMetrics();

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    res.set('Cache-Control', 'public, max-age=0');
    res.attachment('metrics.csv');
    res.status(200);
    res.send(csv);
  }

  async getRequest(req, res) {
    if(this.exportingMetrics){
      return await this.exportMetrics(req, res);
    }

    return res.sendStatus(METHOD_NOT_ALLOWED);
  }

  async postRequest(req, res) {
    res.sendStatus(METHOD_NOT_ALLOWED);
  }
}


module.exports = TableauExport;