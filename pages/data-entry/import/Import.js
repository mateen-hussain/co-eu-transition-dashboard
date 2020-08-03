const Page = require('core/pages/page');
const { paths } = require('config');
const Project = require('models/project');
const Milestone = require('models/milestone');
const sequelize = require('services/sequelize');
const fileUpload = require('express-fileupload');
const flash = require('middleware/flash');
const authentication = require('services/authentication');
const logger = require('services/logger');
const validation = require('helpers/validation');
const parse = require('helpers/parse');
const { removeNulls } = require('helpers/utils');
const config = require('config');
const BulkImport = require('models/bulkImport');

class Import extends Page {
  get url() {
    return paths.dataEntry.import;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader', 'administrator']),
      fileUpload({ safeFileNames: true }),
      flash
    ];
  }

  async import(projects, milestones) {
    const projectFields = await Project.fieldDefintions();
    const milestoneFields = await Milestone.fieldDefintions();

    const transaction = await sequelize.transaction();
    try {
      for(const project of projects) {
        await Project.import(project, projectFields, { transaction });
      }
      if (milestones) {
        for(const milestone of milestones) {
          await Milestone.import(milestone, milestoneFields, { transaction });
        }
      }
      await transaction.commit();

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  validateItems(items, parsedItems, fields) {
    const requiredColumns = fields.filter(field => field.isRequired).map(field => field['importColumnName']);
    const allowedColumns = fields.map(field => field['importColumnName']);

    const columnErrors = validation.validateColumns(Object.keys(items[0]), requiredColumns, allowedColumns);

    const itemErrors = validation.validateItems(parsedItems, fields);

    return [columnErrors, itemErrors];
  }

  async validateProjects(projects) {
    const projectFields = await Project.fieldDefintions(this.req.user);

    const parsedProjects = parse.parseItems(projects, projectFields);
    if (!parsedProjects.length) {
      const projectColumnErrors = [{ error: 'No projects found' }];
      return { projectColumnErrors };
    }

    const [
      projectColumnErrors,
      projectErrors
    ] = this.validateItems(projects, parsedProjects, projectFields);

    return { projectErrors, projectColumnErrors, parsedProjects };
  }

  async validateMilestones(milestones, parsedProjects = []) {
    const milestoneFields = await Milestone.fieldDefintions();

    const parsedMilestones = parse.parseItems(milestones, milestoneFields);
    if (!parsedMilestones.length) {
      return {};
    }

    const projectUidField = milestoneFields.find(milestoneField => milestoneField.name === 'projectUid');
    projectUidField.config = { options: parsedProjects.map(project => project['uid']) };
    projectUidField.type = 'group';

    for(const milestone of parsedMilestones) {
      if(!milestone.priorityTheme) {
        const project = parsedProjects.find(project => project.uid === milestone.projectUid);
        if (project) {
          milestone.priorityTheme = project.deliveryTheme;
        }
      }
    }

    const [
      milestoneColumnErrors,
      milestoneErrors
    ] = this.validateItems(milestones, parsedMilestones, milestoneFields);

    return { milestoneErrors, milestoneColumnErrors, parsedMilestones };
  }

  async validateImport(importData) {
    const data = validation.validateSheetNames(importData.data);

    if (data.errors.length) {
      return {
        errors: { sheetErrors: data.errors },
        importId: importData.id
      };
    }

    const {
      projectErrors,
      projectColumnErrors,
      parsedProjects
    } = await this.validateProjects(data.projects);

    const {
      milestoneErrors,
      milestoneColumnErrors,
      parsedMilestones
    } = await this.validateMilestones(data.milestones, parsedProjects);

    const errors = { projectErrors, milestoneErrors, projectColumnErrors, milestoneColumnErrors };

    return {
      errors: removeNulls(errors, 1),
      projects: parsedProjects,
      milestones: parsedMilestones,
      importId: importData.id
    };
  }

  async finaliseImport(importId) {
    const activeImport = await BulkImport.findOne({
      where: {
        userId: this.req.user.id,
        id: importId,
        category: 'data-entry-old'
      },
      raw: true
    });

    if (!activeImport) {
      return this.res.redirect(config.paths.dataEntry.bulkUploadFile);
    }

    const { errors, projects, milestones } = await this.validateImport(activeImport);
    if (Object.keys(errors).length) {
      return this.res.redirect(this.url);
    }

    try {
      await this.import(projects, milestones);
      await this.removeTemporaryBulkImport(importId);
    } catch (error) {
      logger.error(error);
      this.req.flash('Failed to import data');
      return this.res.redirect(this.url);
    }
    return this.res.redirect(config.paths.dataEntry.submissionSuccess);
  }

  async removeTemporaryBulkImport(importId) {
    await BulkImport.destroy({
      where: {
        userId: this.req.user.id,
        id: importId,
        category: 'data-entry-old'
      }
    });
  }


  async cancelImport(importId) {
    await this.removeTemporaryBulkImport(importId);
    return this.res.redirect(config.paths.dataEntry.bulkUploadFile);
  }

  async postRequest(req, res) {
    if (req.body.cancel && req.body.importId) {
      return await this.cancelImport(req.body.importId);
    }

    if (req.body.import && req.body.importId) {
      return await this.finaliseImport(req.body.importId);
    }

    res.redirect(this.url);
  }

  async getRequest(req, res) {
    const activeImport = await BulkImport.findOne({
      where: {
        userId: req.user.id,
        category: 'data-entry-old'
      },
      raw: true
    });

    if (!activeImport) {
      return res.redirect(config.paths.dataEntry.bulkUploadFile);
    }

    const { errors, projects, milestones, importId } = await this.validateImport(activeImport);

    return res.render(this.template,
      Object.assign(this.locals, {
        errors,
        projects,
        milestones,
        importId
      })
    );
  }
}

module.exports = Import;
