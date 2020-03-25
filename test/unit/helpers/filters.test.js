const filters = require('helpers/filters');
const Project = require('models/project');
const ProjectFieldEntry = require('models/projectFieldEntry');
const ProjectField = require('models/projectField');
const { expect, sinon } = require('test/unit/util/chai');
const sequelize = require('sequelize');
const Milestone = require('models/milestone');
const User = require('models/user');
const Department = require('models/department');
const modelUtils = require('helpers/models');

describe('helpers/filters', () => {
  beforeEach(() => {
    sinon.stub(modelUtils, 'groupSearchItems')
      .returns({ project: {}, milestone: {}, projectField: [], milestoneField: {} });
  });

  afterEach(() => {
    modelUtils.groupSearchItems.restore();
  });

  describe('#getFiltersWithCounts', () => {
    it('calls Projects.findAll with correct arguments', async () => {
      const attribute = {
        fieldName: 'fieldName',
        field: 'field_name'
      };
      const search = {};
      const user = { id: 1 };

      await filters.getFiltersWithCounts(attribute, search, user);
      console.log(JSON.stringify(attribute));

      return sinon.assert.calledWith(Project.findAll, {
        attributes: [
          [sequelize.literal(`project.${attribute.field}`), 'value'],
          [sequelize.literal(`COUNT(DISTINCT projects_count.uid)`), 'count']
        ],
        include: [
          {
            model: Project,
            as: 'projects_count',
            attributes: [],
            where: {[attribute.field]: { [sequelize.Op.ne]: null } },
            required: false,
            include: [{
              required: true,
              as: 'ProjectFieldEntryFilter',
              attributes: [],
              model: ProjectFieldEntry,
              where: []
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
        group: [`project.${attribute.field}`],
        raw: true,
        nest: true,
        includeIgnoreAttributes: false
      });
    });
  });

  describe('#getProjectCoreFields', () => {
    const defaultValue = Project.rawAttributes;

    beforeEach(() => {
      sinon.stub(filters, 'getFiltersWithCounts').returns([
        { value: 'BEIS', count: 2 },
        { value: 'DEFRA', count: 0 },
        { value: 'DFT', count: 1 },
        { value: 'DIT', count: 1 }
      ]);
      Project.rawAttributes = {
        name: {
          fieldName: 'name',
          field: 'name',
          displayName: 'Name',
          searchable: true,
          type: 'string'
        },
        other: {
          fieldName: 'other',
          field: 'other',
          displayName: 'other',
          type: 'string'
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
      filters.getFiltersWithCounts.restore();
      Project.rawAttributes = defaultValue;
      Project.findAll = sinon.stub();
    });

    it('gets project core fields', async () => {
      const search = {};
      const user = { id: 1 };
      const response = await filters.getProjectCoreFields(search, user);

      expect(response.get('name')).to.eql({
        id: 'name',
        name: 'Name',
        options: [
          { value: 'BEIS', count: 2 },
          { value: 'DEFRA', count: 0 },
          { value: 'DFT', count: 1 },
          { value: 'DIT', count: 1 }
        ],
        type: 'string'
      });
    });
  });

  describe('#getProjectFields', () => {
    it('searches project field with correct parameters', async () => {
      const search = {};
      const user = { id: 1 };

      await filters.getProjectFields(search, user);

      return sinon.assert.calledWith(ProjectField.findAll, {
        attributes: [
          [sequelize.literal(`projectField.id`), 'id'],
          [sequelize.literal(`projectField.name`), 'name'],
          [sequelize.literal(`projectField.display_name`), 'displayName'],
          [sequelize.literal(`projectField.type`), 'type'],
          [sequelize.literal(`projectFieldEntries.value`), 'value']
        ],
        group: [
          `projectField.id`,
          `projectField.name`,
          `projectField.display_name`,
          `projectField.type`,
          `projectFieldEntries.value`
        ],
        raw: true,
        includeIgnoreAttributes: false,
        include: [
          {
            model: ProjectFieldEntry,
            include: [
              {
                model: ProjectField,
                required: true
              },
              {
                model: Project,
                required: true,
                include: [{
                  model: Department,
                  required: true,
                  include: [{
                    model: User,
                    required: true,
                    where: {
                      id: user.id
                    }
                  }]
                }]
              }
            ]
          }
        ]
      });
    });
  });

  describe('#getFilters', () => {
    const defaultValue = Project.rawAttributes;
    const user = { id: 1 };

    beforeEach(() => {
      Project.rawAttributes = {
        name: {
          fieldName: 'name',
          displayName: 'Name',
          searchable: true,
          type: 'string'
        }
      };

      Project.findAll.resolves([
        { value: 'BEIS', count: 2 },
        { value: 'DEFRA', count: 0 },
        { value: 'DFT', count: 1 },
        { value: 'DIT', count: 1 }
      ]);

      ProjectField.findAll.resolves([]);
    });

    afterEach(() => {
      Project.rawAttributes = defaultValue;
      Project.findAll = sinon.stub();
      ProjectField.findAll = sinon.stub();
    });

    it('finds filters with attributes that have a displayName', async () => {
      const search = {};
      const optionsWithDefaults = await filters.getFilters(search, user);

      expect(optionsWithDefaults.get('name')).to.eql({
        id: 'name',
        name: 'Name',
        type: 'string',
        options: [
          { value: 'BEIS', count: 2 },
          { value: 'DEFRA', count: 0 },
          { value: 'DFT', count: 1 },
          { value: 'DIT', count: 1 }
        ]
      });
    });
  });
});
