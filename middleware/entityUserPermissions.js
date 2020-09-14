const Entity = require('models/entity');
const User = require('models/user');

const assignEntityIdsUserCanAccessToLocals = async (req, res, next) => {
  const entitiesUserCanAccess = await Entity.findAll({
    attributes: ['publicId', 'id'],
    include: [{
      model: User,
      where: { id: req.user.id },
    },{
      attributes: ['publicId', 'id'],
      model: Entity,
      as: 'children'
    }]
  });

  const allEntities = await Entity.findAll({
    attributes: ['publicId', 'id'],
    include: {
      seperate: true,
      attributes: ['publicId', 'id'],
      model: Entity,
      as: 'children'
    }
  });

  const getEntities = (entities, entity) => {
    entities.push(entity);

    entity.children.forEach(childEntity => {
      const childEntityWithChildren = allEntities.find(entity => entity.id === childEntity.id);
      getEntities(entities, childEntityWithChildren);
    });
  };

  const entities = [];

  for(const entity of entitiesUserCanAccess) {
    getEntities(entities, entity);
  }

  res.locals.entitiesUserCanAccess = entities;

  next();
};

module.exports = { assignEntityIdsUserCanAccessToLocals };