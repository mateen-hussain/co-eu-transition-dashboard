const Page = require('core/pages/page');
const { paths } = require('config');
const Project = require('models/project');
const Milestone = require('models/milestone');
const MilestoneField = require('models/milestoneField');
const MilestoneFieldEntryAudit = require('models/milestoneFieldEntryAudit');

class MilestoneDetails extends Page {
  get url() {
    return paths.milestoneDetails;
  }

  async getProjectMilestone() {
    return await this.req.user.getProjectMilestone(this.req.params.uid);
  }

  async getMilestoneFields() {
    return await Milestone.fieldDefintions();
  }

  async getAuditRecords(milestoneUid, fieldName) {
    const field = await MilestoneField.findOne({
      where: { name: fieldName }
    });

    const auditField = await MilestoneFieldEntryAudit.findAll({
      where: { fieldId: field.id, milestoneUid }
    });

    return auditField;
  }

  async projectInformation(project) {
    const fieldsToShow = ['title', 'sro', 'impact', 'hmgConfidence', 'citizenReadiness', 'businessReadiness', 'euStateConfidence'];

    let fields = await Project.fieldDefintions();
    fields = fields.filter(field => fieldsToShow.includes(field.name));

    return fieldsToShow.map(name => {
      const field = fields.find(field => field.name === name);
      if (field) {
        const value = project.fields.get(field.name);
        return {
          name: field.displayName,
          value: value ? value.value : 'N/A'
        };
      }
      return {};
    });
  }

  transformDeliveryConfidenceValue(value) {
    switch(value) {
    case 3:
      return `${value} - High confidence`;
    case 2:
      return `${value} - Medium confidence`;
    case 1:
      return `${value} - Low confidence`;
    case 0:
      return `${value} - Very low confidence`;
    default:
      return `No level given`;
    }
  }
}

module.exports = MilestoneDetails;