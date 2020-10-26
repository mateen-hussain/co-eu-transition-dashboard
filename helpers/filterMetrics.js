/* eslint-disable no-prototype-builtins */

const filterMetrics = async (user,metrics) => {
  let filteredMetrics = metrics;
  if (!user.isAdmin) {
    const metricMap = await user.getPermittedMetricMap();

    filteredMetrics = filteredMetrics.filter( entity => {
      const fieldEntry = entity.entityFieldEntries.find( fieldEntry => {
        if (fieldEntry.categoryField.name === 'metricID') {
          return true;
        }
      });

      return (fieldEntry && metricMap[fieldEntry.value]);
    });
  }

  return filteredMetrics;
};

module.exports = {
  filterMetrics
};
