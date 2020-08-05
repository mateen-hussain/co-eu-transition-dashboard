const { expect, sinon } = require('test/unit/util/chai');
const Entity = require('models/entity');
const EntityParent = require('models/entityParent');
const EntityFieldEntry = require('models/entityFieldEntry');
const EntityFieldEntryAudit = require('models/entityFieldEntryAudit');
const { STRING, INTEGER } = require('sequelize');
const sequelize = require('services/sequelize');

describe('models/entity', () => {
  it('called Entity.init with the correct parameters', () => {
    expect(Entity.init).to.have.been.calledWith({
      id: {
        type: INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      publicId: {
        type: STRING(64),
        allowNull: true,
        field: "public_id"
      },
      categoryId: {
        type: INTEGER,
        allowNull: false,
        field: "category_id"
      }
    });
  });

  it('called Entity.belongsToMany with the correct parameters', () => {
    expect(Entity.belongsToMany).to.have.been.calledWith(Entity, { through: EntityParent, foreignKey: 'parentEntityId', as: 'children', otherKey: 'entityId' });
  });

  it('called Entity.hasMany with the correct parameters', () => {
    expect(Entity.hasMany).to.have.been.calledWith(EntityFieldEntry, { foreignKey: 'entityId' });
    expect(Entity.hasMany).to.have.been.calledWith(EntityFieldEntryAudit, { foreignKey: 'entityId' });
  });

  it('called EntityFieldEntry.belongsTo with the correct parameters', () => {
    expect(EntityFieldEntry.belongsTo).to.have.been.calledWith(Entity, { foreignKey: 'entityId' });
  });

  it('called EntityFieldEntryAudit.belongsTo with the correct parameters', () => {
    expect(EntityFieldEntryAudit.belongsTo).to.have.been.calledWith(Entity, { foreignKey: 'entityId' });
  });

  describe('#import', () => {
    beforeEach(() => {
      sinon.stub(Entity, 'importFieldEntries').resolves();
      sinon.stub(Entity, 'nextPublicId').resolves('some-public-new-id');
    });

    afterEach(() => {
      Entity.importFieldEntries.restore();
      Entity.nextPublicId.restore();
    });

    it('finds exsisting record if publicId', async () => {
      const entity = { publicId: 'some-public-id' };
      const options = { someoption: 1 };
      const entityFields = [];
      const category = { id: 'some-category-id'}

      Entity.findOne.returns({ id: 'some-id' });

      await Entity.import(entity, category, entityFields, options);

      sinon.assert.calledWith(Entity.findOne, { where: { publicId: entity.publicId } }, options);
      sinon.assert.calledWith(Entity.importFieldEntries, { publicId: 'some-public-id', id: 'some-id' }, entityFields, options);
    });

    it('sets public id if none set', async () => {
      const entity = { };
      const options = { someoption: 1 };
      const entityFields = [];
      const category = { id: 'some-category-id'}

      Entity.create.returns({ id: 'some-id' });

      await Entity.import(entity, category, entityFields, options);

      sinon.assert.calledWith(Entity.nextPublicId, category, options);
      sinon.assert.calledWith(Entity.importFieldEntries, { publicId: 'some-public-new-id', id: 'some-id' }, entityFields, options);
    });

    it('if parent publid id, destory old parent and create new', async () => {
      const entity = { parentPublicId: 'some-parent-id' };
      const options = { someoption: 1 };
      const entityFields = [];
      const category = { id: 'some-category-id'}

      Entity.create.returns({ id: 'some-id' });
      Entity.findOne.returns({ id: 'some-parent-id' });

      await Entity.import(entity, category, entityFields, options);

      sinon.assert.calledWith(EntityParent.destroy, { where: { entityId: 'some-id' } }, options);
      sinon.assert.calledWith(EntityParent.create, { entityId: 'some-id', parentEntityId: 'some-parent-id' }, options);

      sinon.assert.calledWith(Entity.importFieldEntries, { publicId: 'some-public-new-id', id: 'some-id', parentPublicId: 'some-parent-id' }, entityFields, options);
    });

    it('throw error if no parent found', async () => {
      const entity = { parentPublicId: 'some-parent-id' };
      const options = { someoption: 1 };
      const entityFields = [];
      const category = { id: 'some-category-id'}

      Entity.create.returns({ id: 'some-id' });
      Entity.findOne.returns();

      let error;
      try {
        await Entity.import(entity, category, entityFields, options);
      } catch (err) {
        error = err.message;
      }

      expect(error).to.eql('Parent some-parent-id was not found in the database');
    });
  });

  describe('#importFieldEntries', () => {
    beforeEach(() => {
      sinon.stub(EntityFieldEntry, 'import').resolves();
    });

    afterEach(() => {
      EntityFieldEntry.import.restore();
    });

    it('calls EntityFieldEntry.import for each entity', async () => {
      const entity = { 'field1': 'value1', id: 'some-id' };
      const entityFields = [{ name: 'field1', id: 1 }];
      const options = { someoption: 'option' };
      Entity.importFieldEntries(entity, entityFields, options);

      sinon.assert.calledWith(EntityFieldEntry.import, {
        entityId: 'some-id',
        categoryFieldId: 1,
        value: 'value1'
      }, options);
    });
  });

  describe('#nextPublicId', () => {
    const category = {
      publicIdFormat: 'someformat-',
      id: 1
    };

    it('gets next uid', async () => {
      const options = {
        model: Entity,
        mapToModel: true
      };

      sequelize.query.returns([{ publicId: 'someformat-01' }]);

      const newId = await Entity.nextPublicId(category, options);

      sinon.assert.calledWith(sequelize.query, `SELECT public_id FROM entity WHERE category_id=${category.id} ORDER BY public_id DESC LIMIT 1 FOR UPDATE`, options);

      expect(newId).to.eql('someformat-02');
    });

    it('creates first id if no entity returned', async () => {
      const options = {
        model: Entity,
        mapToModel: true
      };
      sequelize.query.returns();

      const newId = await Entity.nextPublicId(category, options);

      sinon.assert.calledWith(sequelize.query, `SELECT public_id FROM entity WHERE category_id=${category.id} ORDER BY public_id DESC LIMIT 1 FOR UPDATE`, options);

      expect(newId).to.eql('someformat-01');
    });

    it('uses transaction and lock if passed in', async () => {
      const options = {
        model: Entity,
        mapToModel: true,
        transaction: {
          LOCK: 'some lock'
        },
        lock: 'some lock'
      };
      sequelize.query.returns();

      const newId = await Entity.nextPublicId(category, options);

      sinon.assert.calledWith(sequelize.query, `SELECT public_id FROM entity WHERE category_id=${category.id} ORDER BY public_id DESC LIMIT 1 FOR UPDATE`, options);

      expect(newId).to.eql('someformat-01');
    });
  });
});
