const logger = require('services/logger');

module.exports = {
  up: async (query) => {
    const transaction = await query.sequelize.transaction();
    try {
      await query.sequelize.query("DELETE FROM user_role WHERE user_id IN (SELECT id FROM user WHERE `role`='viewer')", { type: query.sequelize.QueryTypes.DELETE, transaction, raw: true });
      await query.sequelize.query("INSERT INTO user_role(user_id, role_id) SELECT u.id, r.id FROM user AS u, role AS r WHERE u.role = 'viewer' AND r.name IN ('management', 'management_overview')", { type: query.sequelize.QueryTypes.INSERT, transaction, raw: true });
      await query.sequelize.query("DELETE FROM user_role WHERE user_id IN (SELECT id FROM user WHERE `role`='uploader')", { type: query.sequelize.QueryTypes.DELETE, transaction, raw: true });
      await query.sequelize.query("INSERT INTO user_role(user_id, role_id) SELECT u.id, r.id FROM user AS u, role AS r WHERE u.role = 'uploader' AND r.name IN ('management', 'uploader')", { type: query.sequelize.QueryTypes.INSERT, transaction, raw: true });

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
      await query.sequelize.query("DELETE FROM user_role WHERE user_id IN (SELECT id FROM user WHERE `role`='viewer')", { transaction });
      await query.sequelize.query("DELETE FROM user_role WHERE user_id IN (SELECT id FROM user WHERE `role`='uploader')", { transaction });

      await transaction.commit();
    } catch (error) {
      logger.error(`Error migrating ${error}`);
      logger.error(`Rolling back changes`);
      await transaction.rollback();
      throw error;
    }
  },
}