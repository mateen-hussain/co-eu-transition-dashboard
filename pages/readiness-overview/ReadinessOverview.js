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
      ...authentication.protect(['viewer'])
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

    const themesGrouped = groupBy(data.allThemes, theme => theme.color);

    return {
      headlineMeasures: data.headlineEntites,
      themes: themesGrouped
    };
  }
}

module.exports = ReadinessOverview;