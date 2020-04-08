const Page = require('core/pages/page');
const config = require('config');

class Start extends Page {
  get url() {
    return config.paths.start;
  }

  async handler(req, res) {
    if (req.user.role === 'admin') {
      return res.redirect(config.paths.admin.import);
    }

    if (config.features.missedMilestones){
      return res.redirect(config.paths.missedMilestones);
    }

    return res.redirect(config.paths.allData);
  }
}

module.exports = Start;