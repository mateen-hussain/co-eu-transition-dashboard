const Entity = require('models/entity');
const { expect, sinon } = require('test/unit/util/chai');
const entityUserPermissions = require('middleware/entityUserPermissions');
const User = require('models/user');

describe('middleware/entityUserPermissions', () => {
  describe('#assignEntityIdsUserCanAccessToLocals', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
      req = { user: { id: 1 } };
      res = { locals: {} };
      next = sinon.stub();
    });

    it('sets locals.entitiesUserCanAccess with all entites user can access', async () => {
      const entites = [{
        publicId: 'entity 01',
        id: 1,
        children: []
      },
      {
        publicId: 'entity 02',
        id: 2,
        children: []
      }];

      Entity.findAll.resolves(entites);

      await entityUserPermissions.assignEntityIdsUserCanAccessToLocals(req, res, next);

      sinon.assert.calledWith(Entity.findAll, {
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

      sinon.assert.calledWith(Entity.findAll, {
        attributes: ['publicId', 'id'],
        include: {
          seperate: true,
          attributes: ['publicId', 'id'],
          model: Entity,
          as: 'children'
        }
      });

      sinon.assert.called(next);
      expect(res.locals.entitiesUserCanAccess).to.eql(entites);
    });
  });
});