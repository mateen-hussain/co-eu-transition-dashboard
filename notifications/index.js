const cron = require('node-cron');
const upcomingMilestones = require('./upcomingMilestones');
const updatedMeasures = require('./updatedMeasures');
const logger = require('services/logger');
const config = require('config');

// notify users of upcoming milestones at 10 am each day
cron.schedule(config.notify.cron.missedMilestones, upcomingMilestones.notifyUpcomingMilestones);
logger.info(`Missed milestone notifications active`);
cron.schedule(config.notify.cron.updatedMeasures, updatedMeasures.notifyUpdatedMeasures);
logger.info(`Measures updated today notifications active`);