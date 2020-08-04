const Page = require('core/pages/page');
const { paths } = require('config');
const Entity = require('models/entity');
const config = require('config');
const authentication = require('services/authentication');

class EntityOutput extends Page {
  static get isEnabled() {
    return config.features.entityData;
  }

  get url() {
    return paths.dataEntryEntity.output;
  }

  get middleware() {
    return [
      ...authentication.protect(['administrator'])
    ];
  }

  async output() {
    return await Entity.findAll({
      where: { categoryId: 1 },
      include: {
        model: Entity,
        as: 'children',
        include: {
          model: Entity,
          as: 'children',
          include: {
            model: Entity,
            as: 'children'
          }
        }
      }
    })
  }
}

module.exports = EntityOutput;
