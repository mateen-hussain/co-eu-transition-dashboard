const Sequelize = require('sequelize')
const logger = require('services/logger');

module.exports = {
  up: async (query) => {
    const transaction = await query.sequelize.transaction();
    // logic for transforming into the new state
    try {
      await query.addColumn(
        'entity',
        'updated_at',
        {
          type: Sequelize.DataTypes.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      );

      await query.sequelize.query("UPDATE entity SET `updated_at`=null", { type: query.sequelize.QueryTypes.UPDATE, transaction, raw: true });

      await transaction.commit();
    } catch (error) {
      logger.error(`Error migrating ${error}`);
      logger.error(`Rolling back changes`);
      await transaction.rollback();
      throw error;
    }
  },

  down: async (query) => {
    // logic for reverting the changes
    await query.removeColumn(
      'entity',
      'updated_at'
    );
  }
}