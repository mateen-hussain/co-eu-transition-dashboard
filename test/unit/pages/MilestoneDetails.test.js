const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const MilestoneDetails = require('pages/milestone-details/MilestoneDetails');
const Project = require('models/project');
const Milestone = require('models/milestone');
const MilestoneField = require('models/milestoneField');
const MilestoneFieldEntryAudit = require('models/milestoneFieldEntryAudit');

let page = {};

describe('pages/milestone-details/MilestoneDetails', () => {
  beforeEach(() => {
    page = new MilestoneDetails('some path', {}, {});
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.milestoneDetails);
    });
  });

  describe('#getMilestoneFields', () => {
    it('returns milestone field defintions', async () => {
      Milestone.fieldDefinitions = sinon.stub().returns('some defintions');

      const response = await page.getMilestoneFields();

      expect(response).to.eql('some defintions');
      sinon.assert.called(Milestone.fieldDefinitions);
    });
  });

  describe('#getAuditRecords', () => {
    it('returns audit records for given field name', async () => {
      MilestoneField.findOne.returns({ id: 1 });
      MilestoneFieldEntryAudit.findAll.returns([{ id: 1, value: 'test' }]);

      const response = await page.getAuditRecords('milestone id', 'some name');

      sinon.assert.calledWith(MilestoneField.findOne, { where: { name: 'some name' } });
      sinon.assert.calledWith(MilestoneFieldEntryAudit.findAll, { where: { fieldId: 1, milestoneUid: 'milestone id' } });

      expect(response).to.eql([{ id: 1, value: 'test' }]);
    });
  });

  describe('#projectInformation', () => {
    it('returns audit records for given field name', async () => {
      const project = {
        fields: {
          get: (name) => {
            return { value: project[name] }
          }
        },
        title: 'title',
        sro: 'sro',
        impact: 'impact',
        hmgConfidence: 'hmgConfidence',
        citizenReadiness: 'citizenReadiness',
        businessReadiness: 'businessReadiness',
        euStateConfidence: 'euStateConfidence',
        random: 'random'
      };

      Project.fieldDefinitions = sinon.stub().returns([
        { name: 'title', displayName: 'title' },
        { name: 'sro', displayName: 'sro' },
        { name: 'impact', displayName: 'impact' },
        { name: 'hmgConfidence', displayName: 'hMG Confidence' },
        { name: 'citizenReadiness', displayName: 'citizen Readiness' },
        { name: 'businessReadiness', displayName: 'business Readiness' },
        { name: 'euStateConfidence', displayName: 'euState Confidence' },
        { name: 'random', displayName: 'random' }
      ]);

      const response = await page.projectInformation(project);

      expect(response).to.eql([
        {
          name: "title",
          value: "title"
        },{
          name: "sro",
          value: "sro"
        },{
          name: "impact",
          value: "impact"
        },{
          name: "hMG Confidence",
          value: "hmgConfidence"
        },{
          name: "citizen Readiness",
          value: "citizenReadiness"
        },{
          name: "business Readiness",
          value: "businessReadiness"
        },{
          name: "euState Confidence",
          value: "euStateConfidence"
        }
      ]);
    });
  });

  describe('#transformDeliveryConfidenceValue', () => {
    it(`Transforms Delivery Confidence Value of 0 to "0 - Very low confidence"`, async () => {
      expect(page.transformDeliveryConfidenceValue(0)).to.eql("0 - Very low confidence");
    });

    it(`Transforms Delivery Confidence Value of 1 to "1 - Low confidence"`, async () => {
      expect(page.transformDeliveryConfidenceValue(1)).to.eql("1 - Low confidence");
    });

    it(`Transforms Delivery Confidence Value of 2 to "2 - Medium confidence"`, async () => {
      expect(page.transformDeliveryConfidenceValue(2)).to.eql("2 - Medium confidence");
    });

    it(`Transforms Delivery Confidence Value of 3 to "3 - High confidence"`, async () => {
      expect(page.transformDeliveryConfidenceValue(3)).to.eql("3 - High confidence");
    });

    it(`returns default if no value given "No level given"`, async () => {
      expect(page.transformDeliveryConfidenceValue()).to.eql("No level given");
    });
  });
});