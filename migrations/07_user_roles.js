const logger = require('services/logger');

module.exports = {
  up: async (query) => {
    const transaction = await query.sequelize.transaction();
    try {
      await query.sequelize.query("UPDATE user SET `role`='viewer' WHERE `role`='user'", { type: query.sequelize.QueryTypes.UPDATE, transaction, raw: true });
      await query.sequelize.query("UPDATE user SET `role`='uploader' WHERE `role`='admin'", { type: query.sequelize.QueryTypes.UPDATE, transaction, raw: true });

      await transaction.commit();
    } catch (error) {
      logger.error(`Error migrating ${error}`);
      logger.error(`Rolling back changes`);
      await transaction.rollback();
      throw error;
    }
  },
  down: async (query) => {
    const transaction = await query.sequelize.transaction();
    try {
      await query.sequelize.query("UPDATE user SET `role`='user' WHERE `role`='viewer'", { transaction });
      await query.sequelize.query("UPDATE user SET `role`='user' WHERE `role`='uploader'", { transaction });
      await query.sequelize.query("UPDATE user SET `role`='admin' WHERE `role`='administrator'", { transaction });

      await transaction.commit();
    } catch (error) {
      logger.error(`Error migrating ${error}`);
      logger.error(`Rolling back changes`);
      await transaction.rollback();
      throw error;
    }
  },
}