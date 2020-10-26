/* eslint-disable no-prototype-builtins */

const filterMetrics = async (user,metrics) => {
  let filteredMetrics = metrics;
  if (true || !user.isAdmin) {
    const metricMap = await user.getPermittedMetricMap();

    filteredMetrics = filteredMetrics.filter( entity => {
      const fieldEntry = entity.entityFieldEntries.find( fieldEntry => {
        if (fieldEntry.categoryField.name === 'metricID') {
          return true;
        }
      });

      if (fieldEntry && metricMap[fieldEntry.value]) {
        return true;
      }

      return false;
    });
  }

  return filteredMetrics;
};

module.exports = {
  filterMetrics
};
