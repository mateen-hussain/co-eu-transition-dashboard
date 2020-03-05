const filters = require('helpers/filters');
const Projects = require('models/projects');
const { expect, sinon } = require('test/unit/util/chai');
const sequelize = require('sequelize');

describe('helpers/filters', () => {
  describe('#getFiltersWithCounts', () => {
    it('calls Projects.findAll with correct arguments', async () => {
      const attribute = {
        fieldName: 'field_name'
      };
      const search = {};

      await filters.getFiltersWithCounts(attribute, search);

      return sinon.assert.calledWith(Projects.findAll, {
        attributes: [
          [sequelize.literal(`projects.${attribute.fieldName}`), 'value'],
          [sequelize.literal(`COUNT(projects_count.id)`), 'count']
        ],
        include: [{
          model: Projects,
          as: 'projects_count',
          attributes: [],
          where: search,
          required: false
        }],
        group: `projects.${attribute.fieldName}`,
        raw: true,
        nest: true
      });
    });
  });

  describe('#applyDefaultOptions', () => {
    it('applies default values if defined', () => {
      const attribute = {
        fieldName: 'field_name',
        values: ['value1', 'value2']
      };
      const options = [{
        value: 'value1',
        count: 2
      }];

      const optionsWithDefaults = filters.applyDefaultOptions(attribute, options);

      expect(optionsWithDefaults).to.eql([ { value: 'value1', count: 2 }, { value: 'value2', count: 0 } ]);
    });

    it('does not apply default values if not defined', () => {
      const attribute = {
        fieldName: 'field_name'
      };
      const options = [{
        value: 'value1',
        count: 2
      }];

      const optionsWithDefaults = filters.applyDefaultOptions(attribute, options);

      expect(optionsWithDefaults).to.eql([ { value: 'value1', count: 2 } ]);
    });
  });

  describe('#getFilters', () => {
    const defaultValue = Projects.rawAttributes;

    beforeEach(() => {
      Projects.rawAttributes = {
        name: {
          fieldName: 'name',
          displayName: 'Name'
        }
      };

      Projects.findAll.resolves([
        { value: 'BEIS', count: 2 },
        { value: 'DEFRA', count: 0 },
        { value: 'DFT', count: 1 },
        { value: 'DIT', count: 1 }
      ])
    });

    afterEach(() => {
      Projects.rawAttributes = defaultValue;
      Projects.findAll = sinon.stub();
    });

    it('finds filters with attributes that have a displayName', async () => {
      const search = {};
      const optionsWithDefaults = await filters.getFilters(search);

      expect(optionsWithDefaults).to.eql([{
        id: 'name',
        name: 'Name',
        options: [
          { value: 'BEIS', count: 2 },
          { value: 'DEFRA', count: 0 },
          { value: 'DFT', count: 1 },
          { value: 'DIT', count: 1 }
        ]
      }]);
    });

    it('finds filters with attributes without a displayName', async () => {
      Projects.rawAttributes = {
        name: {
          fieldName: 'name'
        }
      };

      const search = {};
      const optionsWithDefaults = await filters.getFilters(search);
      expect(optionsWithDefaults).to.eql([]);
    });
  });
});