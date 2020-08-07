const config = require('config');
const User = require("models/user");
const Department = require("models/department");
const moment = require('moment');
const NotifyClient = require('notifications-node-client').NotifyClient;
const sequelize = require('services/sequelize');
const DAO = require('services/dao');
const logger = require('services/logger');
const { v4: uuidv4 } = require('uuid');

const dao = new DAO({
  sequelize: sequelize
});

const getProjectsDueInNextTwoDays = async () => {
  const search = {
    date: {
      from: moment().add('2', 'days').format('DD/MM/YYYY'),
      to: moment().add('2', 'days').format('DD/MM/YYYY')
    },
    complete: ['No']
  };

  return await dao.getAllData(null, search);
};

const groupProjectsByDepartment = projects => {
  return projects.reduce((departments, project) => {
    departments[project.departmentName] = departments[project.departmentName] || [];
    departments[project.departmentName].push(project);
    return departments;
  }, {});
};

const getUsers = async (departmentName) => {
  return await User.findAll({
    include: [{
      model: Department,
      where: {
        name: departmentName
      }
    }],
    where: {
      role: 'uploader'
    }
  });
};

const sendEmails = async (projectsByDepartment) => {
  const notifyClient = new NotifyClient(config.notify.apiKey);
  const summary = { infos: [], errors: [] };

  for(const departmentName in projectsByDepartment) {
    const users = await getUsers(departmentName);

    const list = projectsByDepartment[departmentName].reduce((list, project) => {
      project.milestones.forEach(milestone => {
        list.push(`${project.title} - ${milestone.uid}`);
      });
      return list;
    }, []);

    for(const user of users) {
      try {
        await notifyClient.sendEmail(
          config.notify.missedMilestonesKey,
          user.email,
          {
            personalisation: {
              email_address: user.email,
              list: list.join('; '),
              link: config.serviceUrl
            },
            reference: `${user.id}`
          }
        );
        summary.infos.push(`Send upcoming milestone email to ${user.email} for milestones: ${list.join('; ')}`);
        logger.info(`Send upcoming milestone email to ${user.email} for milestones: ${list.join('; ')}`);
      } catch (error) {
        summary.infos.push(`Error sending upcoming milestones email to ${user.email}". ${error}`);
        logger.error(`Error sending upcoming milestones email to ${user.email}". ${error}`);
      }
    }
  }

  return summary;
};

const setLock = async () => {
  const guid = uuidv4();
  const query = `UPDATE dashboard_locks SET guid=? WHERE name=? AND guid IS NULL`;
  const options = {
    replacements: [ guid, config.locks.upcomingMilestonesNotifications ]
  };
  await sequelize.query(query, options);
  return guid;
};

const getLock = async (guid) => {
  const query = `SELECT * FROM dashboard_locks WHERE guid=? AND name=?`;
  const options = {
    replacements: [ guid, config.locks.upcomingMilestonesNotifications ]
  };
  const response = await sequelize.query(query, options);
  return response[0].length > 0;
};

const clearLock = async () => {
  const query = `UPDATE dashboard_locks SET guid=NULL WHERE name=?`;
  const options = {
    replacements: [ config.locks.upcomingMilestonesNotifications ]
  };
  await sequelize.query(query, options);
};

const sendSummaryNotification = async (summary = { infos: [], errors: [] }) => {
  const notifyClient = new NotifyClient(config.notify.apiKey);

  try {
    await notifyClient.sendEmail(
      config.notify.summaryNotificationKey,
      config.notify.summaryNotificationEmail,
      {
        personalisation: {
          email_address: config.notify.summaryNotificationEmail,
          infos: summary.infos.join(', '),
          errors: summary.errors.join(', ')
        }
      }
    );
  } catch (error) {
    logger.error(`Error sending summary notification email. ${error}`);
  }
};

const notifyUpcomingMilestones = async () => {
  logger.info('Selecting node to send milestone notifications');
  try {
    const guid = await setLock();

    if(await getLock(guid)) {
      logger.info('node selected, Send upcoming milstones notifications');
      const projects = await getProjectsDueInNextTwoDays();
      const projectsByDepartment = groupProjectsByDepartment(projects);
      const summary = await sendEmails(projectsByDepartment);
      await sendSummaryNotification(summary);
    }
  }
  catch(error) {
    logger.error(`Error notify Upcoming Milestones: ${error}`);
    await sendSummaryNotification({ infos: [], errors: [error] });
  }
  finally {
    logger.info('finished Send upcoming milstones notifications');
    await clearLock();
  }
};

module.exports = {
  setLock,
  getLock,
  clearLock,
  notifyUpcomingMilestones,
  sendEmails,
  getUsers,
  getProjectsDueInNextTwoDays,
  groupProjectsByDepartment,
  sendSummaryNotification
};
