const Page = require('core/pages/page');
const { paths } = require('config');

class SubmissionSuccess extends Page {
  get url() {
    return paths.dataEntry.submissionSuccess;
  }
}

module.exports = SubmissionSuccess;
