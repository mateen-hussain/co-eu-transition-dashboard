const Page = require('core/pages/page');
const { paths } = require('config');
const flash = require('middleware/flash');

class ProjectFieldInput extends Page {
  get url() {
    return paths.admin.projectFieldInput;
  }

  get middleware() {
    return [
      flash
    ];
  }

  async postRequest(req, res) {
    if ((!req.body['field-name']) || (!req.body['field-description']) || (!req.body['column-name'])) {
      req.flash('You must fill in all the fields before you can review the field details');
    } else {
      console.log('Do something')
    }
    return res.redirect(this.url);
  }
}

module.exports = ProjectFieldInput;