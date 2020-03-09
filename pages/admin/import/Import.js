const Page = require('core/pages/page');
const { paths } = require('config');
const xlsx = require('services/xlsx');
const Projects = require('models/projects');
const Milestones = require('models/milestones');
const fileUpload = require('express-fileupload');
const flash = require('middleware/flash');
const authentication = require('services/authentication');

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

  async importData(req) {
    const sheets = xlsx.parse(req.files.import.data);

    const firstSheet = sheets[0];

    for(const item of firstSheet) {
      const project = Object.keys(Projects.rawAttributes).reduce((project, attribute) => {
        project[attribute] = item[attribute];
        return project;
      }, {});

      project.milestones = Object.keys(Milestones.rawAttributes).reduce((milestone, attribute) => {
        milestone[attribute] = item[attribute];
        return milestone;
      }, {});

      await Projects.create(project, { include: Milestones });
    }

    req.flash(`Imported ${req.files.import.name} successfully`);
  }

  async postRequest(req, res) {
    if (req.files) {
      try {
        await this.importData(req);
      } catch(error) {
        req.flash(error.message);
      }
    }

    res.redirect(this.url);
  }
}

module.exports = Import;