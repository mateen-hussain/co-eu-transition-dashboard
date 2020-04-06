const Page = require('core/pages/page');
const { paths } = require('config');
const xlsx = require('services/xlsx');
const Project = require('models/project');
const ProjectField = require('models/projectField');
const ProjectFieldEntry = require('models/projectFieldEntry');
const Milestone = require('models/milestone');
const MilestoneField = require('models/milestoneField');
const MilestoneFieldEntry = require('models/milestoneFieldEntry');
const sequelize = require('services/sequelize');
const fileUpload = require('express-fileupload');
const flash = require('middleware/flash');
const authentication = require('services/authentication');
const modelUtils = require('helpers/models');
const logger = require('services/logger');

const projectDatabaseExcelMap = {
  'uid': 'UID',
  'departmentName': 'Dept',
  'title': 'Project Title',
  'description': 'Project Description',
  'impact': 'Impact Rating',
  'sro': 'Project SRO + email address',

  'deliveryTheme': 'Priority Theme',
  'solution': 'Solution',
  'progressStatus': 'Progress status',
  'deliveryBarriers': 'Delivery Barriers',
  'deliveryBarriersRationale': 'Delivery Barriers Rationale',
  'beginDelivery': 'Latest date by which delivery can begin?',
  'hmgConfidence': 'HMG Delivery Confidence',
  'hmgDeliveryConfidenceRationale': 'HMG Delivery Confidence Rationale',
  'withdrawalAgreement': 'Withdrawal Agreement',
  'withdrawalAgreementDetails': 'Withdrawal Agreement - Details',
  'citizenAction': 'Will citizens need to take action?',
  'citizenReadiness': 'Citizen readiness confidence',
  'businessAction': 'Will businesses need to take action?',
  'businessReadiness': 'Business readiness confidence',
  'euStatesAction': 'Will EU Member State(s) needs to take action?',
  'euStateConfidence': 'EU Member States Confidence',
  'possibleNegotiationOutcomes': 'Possible negotiation outcomes',
  'baselineDeliveryChange': 'Nature of change to baseline delivery',
  'baselineDeliveryChangeImpact': 'Impact of altering Baseline delivery',
  'changeInImpact': 'Change in impact',
  'changeStartDate': 'Change in latest start date',
};

const milestoneDatabaseExcelMap = {
  'projectUid': 'Project UID',
  'uid': 'Milestone UID',
  'description': 'Milestone Description',
  'date': 'Target date for delivery',

  'deliveryDate': 'Last possible date for delivery',
  'complete': 'Is the milestone COMPLETE?',
  'deliveryConfidence': 'What is your confidence in delivery of this milestone',
  'category': 'Milestone Category',
  'reprofiledReason': 'If milestone date has been reprofiled, what is the reason for this?',
  'comments': 'Comments'
};

class Import extends Page {
  get url() {
    return paths.admin.import;
  }

  get middleware() {
    return [
      ...authentication.protect(['admin']),
      fileUpload({ safeFileNames: true }),
      flash
    ];
  }

  async importItem(item, model, fieldModel, fields, fieldEntryModel, databaseExcelMap, transaction) {
    const newItem = { [fieldEntryModel.options.name.plural]: [] };

    for (const [databaseName, excelName] of Object.entries(databaseExcelMap)) {

      let value = item[excelName];
      const isNA = String(value || '').toLowerCase().includes('n/a');

      if (Object.keys(model.rawAttributes).includes(databaseName)) {
        if (isNA) {
          if (!model.rawAttributes[databaseName].allowNull) {
            throw Error(`Field must have a value ${excelName}`);
          }
          continue;
        }
        if(model.rawAttributes[databaseName].type.toString() === 'DATETIME') {
          value = modelUtils.parseFieldEntryValue(value, 'date', true);
        }
        newItem[databaseName] = value;
      } else {
        const field = fields.find(field => field.name === databaseName);

        if (field) {
          if(!String(value || '').length && value !== 0) {
            if (field.is_required) {
              throw Error(`Field must have a value ${excelName}`);
            }
            continue;
          }

          if (isNA) {
            if (field.is_required) {
              throw Error(`Field must have a value ${excelName}`);
            }
            continue;
          }

          if(field.type === 'date') {
            value = modelUtils.parseFieldEntryValue(value, field.type, true);
          }

          const entry = await fieldEntryModel.build({
            uid: item[databaseExcelMap.uid],
            fieldId: field.id,
            value,
            [fieldModel.name]: field
          }, { include: [ fieldModel ] });

          try {
            await entry.validate();
          } catch (error) {
            error.message = `Validation error with column: "${excelName}". Error: ${error.message}`
            throw error;
          }

          newItem[fieldEntryModel.options.name.plural].push(entry);
        } else {
          throw Error(`No field found for ${excelName}`);
        }
      }
    }

    await model.create(newItem, {
      include: [{
        model: fieldEntryModel
      }],
      transaction
    });
  }

  async importItems(items, model, fieldModel, fieldEntryModel, databaseExcelMap, transaction) {
    const fields = await fieldModel.findAll();

    for(const item of items) {
      try {
        await this.importItem(item, model, fieldModel, fields, fieldEntryModel, databaseExcelMap, transaction);
      } catch (error) {
        error.message = `Error importing row:<br><br>${JSON.stringify(item)}<br><br>${error.message}`;
        throw error;
      }
    }
  }

  async emptyTables(transaction) {
    await MilestoneFieldEntry.destroy({
      where: {},
      transaction
    });
    await Milestone.destroy({
      where: {},
      transaction
    });

    await ProjectFieldEntry.destroy({
      where: {},
      transaction
    });
    await Project.destroy({
      where: {},
      transaction
    });
  }

  async importData(req) {
    const sheets = xlsx.parse(req.files.import.data);

    const data = {
      projects: sheets[0],
      milestones: sheets[1]
    };

    const transaction = await sequelize.transaction();

    try {
      await this.emptyTables(transaction);

      await this.importItems(data.projects, Project, ProjectField, ProjectFieldEntry, projectDatabaseExcelMap, transaction);
      await this.importItems(data.milestones, Milestone, MilestoneField, MilestoneFieldEntry, milestoneDatabaseExcelMap, transaction);

      await transaction.commit();

      req.flash(`Imported ${req.files.import.name} successfully`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async postRequest(req, res) {
    if (req.files) {
      try {
        await this.importData(req);
      } catch(error) {
        logger.error(error);
        req.flash(error.message);
      }
    }

    res.redirect(this.url);
  }
}

module.exports = Import;