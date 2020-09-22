const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const groupBy = require('lodash/groupBy');
const transitionReadinessData = require('helpers/transitionReadinessData');
const HeadlineMeasures = require('models/headlineMeasures');

class ReadinessOverview extends Page {
  get url() {
    return paths.readinessOverview;
  }

  get middleware() {
    return [
      ...super.middleware,
      ...authentication.protect(['management_overview'])
    ];
  }

  async data() {
    const headlinePublicIds = await HeadlineMeasures.findAll({
      order: ['priority']
    });
    const data = await transitionReadinessData.overview(paths.transitionReadinessThemeDetail, headlinePublicIds.map(entity => entity.entityPublicId));

    data.allThemes.forEach(entity => {
      entity.link = `${paths.transitionReadinessThemeDetail}/${entity.publicId}`;
      entity.active = true;
    });

    const themesWithStubs = [...this.stubThemes, ...data.allThemes]

    const themesGrouped = groupBy(themesWithStubs, theme => theme.color);

    return {
      headlineMeasures: data.headlineEntites,
      themes: themesGrouped
    };
  }

  get stubThemes() {
    return [
      {
        name: "economy",
        color:  "amber",
        description: "Theme due online: 30/09/2020"
      },
      {
        name: "Data",
        color:  "amber",
        description: "Theme due online: 30/09/2020"
      },
      {
        name: "Energy / Environment",
        color:  "yellow",
        description: "Theme due online: 30/09/2020"
      },
      {
        name: "Animals & food",
        color:  "amber",
        description: "Theme due online: 30/09/2020"
      },
      {
        name: "Fisheries",
        color:  "amber",
        description: "Theme due online: 30/09/2020"
      },
      {
        name: "Security",
        color:  "yellow",
        description: "Theme due online: 30/09/2020"
      },
      {
        name: "International agreements",
        color:  "yellow",
        description: "Theme due online: 30/09/2020"
      }
    ];
  }
}

module.exports = ReadinessOverview;