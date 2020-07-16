const cron = require('node-cron');
const upcomingMilestones = require('./upcomingMilestones');
const logger = require('services/logger');

// notify users of upcoming milestones at 10 am each day
cron.schedule('0 0 10 * * *', upcomingMilestones.notifyUpcomingMilestones);
logger.info(`Missed milestone notifications active`);