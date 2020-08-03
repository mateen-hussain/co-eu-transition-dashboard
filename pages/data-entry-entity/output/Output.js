const Page = require('core/pages/page');
const { paths } = require('config');
const Entity = require('models/entity');
const config = require('config');

class Output extends Page {
  static get isEnabled() {
    return config.features.entityData;
  }

  get url() {
    return paths.dataEntryEntity.output;
  }

  // privacy-notice page does not require user authentication
  get middleware() {
    return [];
  }

  async output() {
    return await Entity.findAll({
      where: { categoryId: 1 },
      include: {
        model: Entity,
        as: 'children',
        include: {
          model: Entity,
          as: 'children'
        }
      }
    })
  }
}

module.exports = Output;
