const logger = require('services/logger');

const up = async (query) => {
  await query.addConstraint('milestone_field', {
    fields: ['name'],
    type: 'unique',
    name: 'unique_milestone_field_name'
  });

  await query.addConstraint('project_field', {
    fields: ['name'],
    type: 'unique',
    name: 'unique_project_field_name'
  });
};

const down = async (query) => {
  try{
    await query.removeConstraint('milestone_field', 'unique_milestone_field_name');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }

  try{
    await query.removeConstraint('project_field', 'unique_project_field_name');
  } catch (error) {
    logger.error(`Error rolling back ${error}`);
  }
};

module.exports = {
  up: async (query) => {
    try {
      await up(query);
    } catch (error) {
      logger.error(`Error migrating ${error}`);
      logger.error(`Rolling back changes`);
      await down(query);
      throw error;
    }
  },
  down
}