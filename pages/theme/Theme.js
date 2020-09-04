const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const config = require('config');

class Theme extends Page {
  static get isEnabled() {
    return config.features.theme;
  }

  get url() {
    return paths.theme;
  }

  get middleware() {
    return [
      ...authentication.protect(['management_overview'])
    ];
  }

  topLevelOutcomeStatements() {
    return [{
      name: 'Category one goods',
      color: 'yellow',
      description: 'Supply of category one goods will be undistrupted',
      link: 'someurl'
    }, {
      name: 'Other goods categories',
      color: 'red',
      active: true,
      description: 'Minimise distruption of the import and export of goods between GB and EU',
      link: 'someurl'
    }, {
      name: 'Passengers',
      color: 'green',
      description: 'Minimise distruption of the import and export of goods between GB and EU',
      link: 'someurl'
    }, {
      name: 'Passengers',
      color: 'green',
      description: 'Minimise distruption of the import and export of goods between GB and EU',
      link: 'someurl'
    }, {
      name: 'Passengers',
      color: 'green',
      description: 'Minimise distruption of the import and export of goods between GB and EU',
      link: 'someurl'
    }, {
      name: 'Passengers',
      color: 'green',
      description: 'Minimise distruption of the import and export of goods between GB and EU',
      link: 'someurl'
    }, {
      name: 'Passengers',
      color: 'green',
      description: 'Minimise distruption of the import and export of goods between GB and EU',
      link: 'someurl'
    }, {
      name: 'Passengers',
      color: 'green',
      description: 'Minimise distruption of the import and export of goods between GB and EU',
      link: 'someurl'
    }, {
      name: 'Passengers',
      color: 'green',
      description: 'Minimise distruption of the import and export of goods between GB and EU',
      link: 'someurl'
    }];
  }
}

module.exports = Theme;