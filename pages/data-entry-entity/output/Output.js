const Page = require('core/pages/page');
const { paths } = require('config');
const Entity = require('models/entity');

class Output extends Page {
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
