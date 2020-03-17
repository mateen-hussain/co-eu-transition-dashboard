const filters = require('helpers/filters');
const Project = require('models/project');
const ProjectFieldEntry = require('models/projectFieldEntry');
const { expect, sinon } = require('test/unit/util/chai');
const sequelize = require('sequelize');
const Milestone = require('models/milestone');
const User = require('models/user');
const Department = require('models/department');

describe('helpers/filters', () => {
  describe('#getFiltersWithCounts', () => {
    it('calls Projects.findAll with correct arguments', async () => {
      const attribute = {
        fieldName: 'field_name'
      };
      const search = {};
      const user = { id: 1 };

      await filters.getFiltersWithCounts(attribute, search, user);

      return sinon.assert.called(Project.findAll);
    });

    it('calls Projects.findAll with correct arguments for attribute with counts', async () => {
      const attribute = {
        fieldName: 'field_name'
      };
      const search = {};
      const user = { id: 1 };

      await filters.getFiltersWithCounts(attribute, search, user);

      return sinon.assert.calledWith(Project.findAll, {
        attributes: [
          [sequelize.literal(`project.${attribute.fieldName}`), 'value'],
          [sequelize.literal(`COUNT(DISTINCT projects_count.uid)`), 'count']
        ],
        include: [
          {
            model: Project,
            as: 'projects_count',
            attributes: [],
            where: {[attribute.fieldName]: { [sequelize.Op.ne]: null } },
            required: false,
            include: [{
              required: true,
              as: 'ProjectFieldEntryFilter',
              attributes: [],
              model: ProjectFieldEntry,
              where: {
                [sequelize.Op.and]: []
              }
            }]
          },
          {
            model: Milestone,
            attributes: [],
            required: true,
            where: {}
          },
          {
            model: Department,
            required: true,
            attributes: [],
            include: [{
              attributes: [],
              model: User,
              required: true,
              where: {
                id: user.id
              }
            }]
          }
        ],
        group: [`project.${attribute.fieldName}`],
        raw: true,
        nest: true,
        includeIgnoreAttributes: false
      });
    });
  });

  describe('#getProjectCoreFields', () => {
    const defaultValue = Project.rawAttributes;

    beforeEach(() => {
      Project.rawAttributes = {
        name: {
          fieldName: 'name',
          displayName: 'Name',
          searchable: true
        },
        other: {
          fieldName: 'other',
          displayName: 'other'
        }
      };

      Project.findAll.resolves([
        { value: 'BEIS', count: 2 },
        { value: 'DEFRA', count: 0 },
        { value: 'DFT', count: 1 },
        { value: 'DIT', count: 1 }
      ])
    });

    afterEach(() => {
      Project.rawAttributes = defaultValue;
      Project.findAll = sinon.stub();
    });

    it('gets project core fields', async () => {
      const search = {};
      const user = { id: 1 };
      const response = await filters.getProjectCoreFields(search, user);

      expect(response).to.eql([{
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
  });

  describe.skip('#getFilters', () => {
    const defaultValue = Project.rawAttributes;

    beforeEach(() => {
      Project.rawAttributes = {
        name: {
          fieldName: 'name',
          displayName: 'Name'
        }
      };

      Project.findAll.resolves([
        { value: 'BEIS', count: 2 },
        { value: 'DEFRA', count: 0 },
        { value: 'DFT', count: 1 },
        { value: 'DIT', count: 1 }
      ])
    });

    afterEach(() => {
      Project.rawAttributes = defaultValue;
      Project.findAll = sinon.stub();
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
      Project.rawAttributes = {
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