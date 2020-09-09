const logger = require('services/logger');

const up = async (query) => {
  await query.addConstraint('user_role', ['user_id', 'role_id'], {
    type: 'primary key',
    name: 'user_role_pkey'
  });
};

const down = async (query) => {
  try {
    await query.removeConstraint('user_role', 'user_role_pkey');
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
