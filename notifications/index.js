const cron = require('node-cron');
const upcomingMilestones = require('./upcomingMilestones');
const logger = require('services/logger');
const config = require('config');

// notify users of upcoming milestones at 10 am each day
cron.schedule(config.notify.cron, upcomingMilestones.notifyUpcomingMilestones);
logger.info(`Missed milestone notifications active`);