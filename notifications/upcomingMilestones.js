const config = require('config');
const User = require("models/user");
const Department = require("models/department");
const moment = require('moment');
const NotifyClient = require('notifications-node-client').NotifyClient;
const sequelize = require('services/sequelize');
const DAO = require('services/dao');
const logger = require('services/logger');

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

  for(const departmentName in projectsByDepartment) {
    const users = await getUsers(departmentName);

    const list = projectsByDepartment[departmentName].reduce((list, project) => {
      project.milestones.forEach(milestone => {
        list.push(`${project.title} - ${milestone.description}`);
      });
      return list;
    }, []);

    for(const user of users) {
      logger.info(`Send upcoming milestone email to ${user.email}`);
      notifyClient.sendEmail(
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
    }
  }
};

const notifyUpcomingMilestones = async () => {
  const projects = await getProjectsDueInNextTwoDays();
  const projectsByDepartment = groupProjectsByDepartment(projects);
  await sendEmails(projectsByDepartment);
};

module.exports = {
  notifyUpcomingMilestones,
  sendEmails,
  getUsers,
  getProjectsDueInNextTwoDays,
  groupProjectsByDepartment
};
