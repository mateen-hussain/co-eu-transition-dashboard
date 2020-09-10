const Page = require('core/pages/page');
const { paths } = require('config');
const tableau = require('services/tableau');
const logger = require('services/logger');
const authentication = require('services/authentication');
const groupBy = require('lodash/groupBy');

const getTableauUrl = async (req, res, next) => {
  try {
    res.locals.tableauIframeUrl = await tableau.getTableauUrl(req.user, 'Readiness', 'Landing');
  } catch (error) {
    res.locals.tableauIframeError = error;
    logger.error(`Error from tableau: ${error}`);
  }
  next();
};

class ReadinessOverview extends Page {
  get url() {
    return paths.readinessOverview;
  }

  async getHeadlineFigures() {
    return [{
      name: "Number of registrations to the Export Health Certificates online system",
      color:  "green",
      theme: "borders",
      description: "44 additional registrations this week",
      link: `${paths.transitionReadinessThemeDetail}/B`
    },
    {
      name: "% of UK travellers who are aware that 'Due to changes in passport validity rules, some UK passport holders will need to renew their passports earlier than expected'",
      color:  "red",
      theme: "borders",
      description: "34%",
      link: `${paths.transitionReadinessThemeDetail}/B`
    },
    {
      name: "Number of registrations to the IPAFFS system",
      color:  "green",
      theme: "people",
      description: "16 additional registrations this week",
      link: `${paths.transitionReadinessThemeDetail}/B`
    },
    {
      name: "EEA citizens in the UK who have applied to the EUSS to allow them to live/work/study in the UK as they do now after 30 June 2021",
      color:  "red",
      theme: "people",
      description: "2,041,200 granted settled status",
      link: `${paths.transitionReadinessThemeDetail}/P`
    },
    {
      name: "% of EEA citizens who understand what the new immigration system means for them",
      color:  "amber",
      theme: "people",
      description: "62%",
      link: `${paths.transitionReadinessThemeDetail}/P`
    },
    {
      name: "% of UK citizens living in the EU who are aware of changes to healthcare provisions and the actions needed to secure healthcare for after the transition",
      color:  "yellow",
      theme: "people",
      description: "68%",
      link: `${paths.transitionReadinessThemeDetail}/P`
    },
    ]
  }

  async getThemeRisks() {
    return [{
      name: "borders",
      color:  "red",
      description: "To minimise disruption to the movement of goods and people through borders",
      link: `${paths.transitionReadinessThemeDetail}/B`,
      active: true
    },
    {
      name: "people",
      color:  "red",
      description: "To protect professional, residential, educational, healthcare, law and economic rights of UK and EU citizens",
      link: `${paths.transitionReadinessThemeDetail}/P`,
      active: true
    },
    {
      name: "economy",
      color:  "red",
      description: "Theme due online: 30/09/2020",
      active: false
    },
    {
      name: "Data",
      color:  "red",
      description: "Theme due online: 30/09/2020",
      active: false
    },
    {
      name: "Energy / Environment",
      color:  "red",
      description: "Theme due online: 30/09/2020",
      active: false
    },
    {
      name: "Animals & food",
      color:  "yellow",
      description: "Theme due online: 30/09/2020",
      active: false
    },
    {
      name: "Fish",
      color:  "yellow",
      description: "Theme due online: 30/09/2020",
      active: false
    },
    {
      name: "Security",
      color:  "green",
      description: "Theme due online: 30/09/2020",
      active: false
    },
    {
      name: "International agreements",
      color:  "green",
      description: "Theme due online: 30/09/2020",
      active: false
    },
    {
      name: "programmes",
      color:  "green",
      description: "Theme due online: 30/09/2020",
      active: false
    },
    ]
  }

  async data() {
    const headlineFigures = await this.getHeadlineFigures();

    const themes = await this.getThemeRisks();
    const themesGrouped = groupBy(themes, theme => theme.color);

    return {
      headlineFigures,
      themes: themesGrouped
    }
  }

  get middleware() {
    return [
      ...super.middleware,
      getTableauUrl,
      ...authentication.protect(['viewer'])
    ];
  }
}

module.exports = ReadinessOverview;
