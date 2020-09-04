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

  get subOutcomeData() {
    return [
      {
        name: 'Empirical',
        link: 'http:www.link.com"',
        active: true,
        color: 'red',
        children: [
          {
            name: 'Import',
            active: true,
            color: 'orange',
            children: [
              {
                name: 'UK Business Licensing',
                active: true,
                color: 'red',
                isLastExpandable: true,
                children: [
                  {
                    name: '% of EU traders that have an EORI number',
                    link: 'http://www.bbc.co.uk"',
                    color: 'orange',
                  },
                  {
                    name: '% of Food business (by import value) that have registered on IPAFFS',
                    link: 'http://www.bbc.co.uk"',
                    color: 'green',
                  }
                  ,
                  {
                    name: '% of Excise business (by import value) that have completed E68/E69/E70/E71 form',
                    link: 'http://www.bbc.co.uk"',
                    color: 'green',
                  }
                ]
              }
            ]
          },
          {
            name: 'Export',
            active: false,
            color: 'green',
          }
        ], 
      },
      {
        name: 'Comms',
        link: 'http:www.link.com"',
        active: false,
        color: 'orange',
        children: [], 
      },
      {
        name: 'HMG Delivery',
        link: 'http:www.link.com"',
        active: false,
        color: 'green',
        children: [], 
      }
    ]
  }
}

module.exports = Theme;