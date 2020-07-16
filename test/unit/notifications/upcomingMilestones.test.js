const { sinon, expect } = require('test/unit/util/chai');
const User = require("models/user");
const Department = require("models/department");
const proxyquire = require('proxyquire');
const config = require('config');
const moment = require('moment');

let sendEmailStub = sinon.stub();
let getAllDataStub = sinon.stub();

const notificationsNodeClientStub = {
  NotifyClient: function() {
    return {
      sendEmail: sendEmailStub
    };
  }
};

const daoStub = function() {
  return {
    getAllData: getAllDataStub
  };
};

const upcomingMilestones = proxyquire('notifications/upcomingMilestones', {
  'notifications-node-client': notificationsNodeClientStub,
  'services/dao': daoStub
});

describe('notifications/upcomingMilestones', () => {
  describe('#getProjectsDueInNextTwoDays', () => {
    it('gets all projects that have milestones due in two days time that are not complete', async () => {
      await upcomingMilestones.getProjectsDueInNextTwoDays();

      const search = {
        date: {
          from: moment().add('2', 'days').format('DD/MM/YYYY'),
          to: moment().add('2', 'days').format('DD/MM/YYYY')
        },
        complete: ['No']
      };

      sinon.assert.calledWith(getAllDataStub, null, search);
    })
  });

  describe('#groupProjectsByDepartment', () => {
    it('groups projects into departments', () => {
      const projects = [{
        departmentName: 'Foo'
      },{
        departmentName: 'Foo'
      },{
        departmentName: 'Bar'
      }];

      const departments = upcomingMilestones.groupProjectsByDepartment(projects);

      const expected = {
        'Foo': [{
          departmentName: 'Foo'
        },{
          departmentName: 'Foo'
        }],
        'Bar': [{ departmentName: 'Bar' }]
      }

      expect(departments).to.eql(expected);
    });
  });

  describe('#getUsers', () => {
    it('finds users with upload permissions for a given department', async () => {

      const departmentName = 'some-department';
      await upcomingMilestones.getUsers(departmentName);

      sinon.assert.calledWith(User.findAll, {
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
    });
  });

  describe('#sendEmails', () => {
    const projectsByDepartment = {
      'department1': [{
        title: 'project title',
        milestones: [{ description: 'milestone description' }]
      }]
    };

    const users = [{
      email: 'email@email.com',
      id: 1
    },{
      email: 'email2@email.com',
      id: 2
    }];

    beforeEach(() => {
      User.findAll.resolves(users);
    });

    it('sends emails to users', async () => {
      const list = [
        `${projectsByDepartment['department1'][0].title} - ${projectsByDepartment['department1'][0].milestones[0].description}`
      ];

      await upcomingMilestones.sendEmails(projectsByDepartment);

      sinon.assert.calledWith(sendEmailStub, config.notify.missedMilestonesKey,
        users[0].email,
        {
          personalisation: {
            email_address: users[0].email,
            list: list.join('; '),
            link: config.serviceUrl
          },
          reference: `${users[0].id}`
        }
      );

      sinon.assert.calledWith(sendEmailStub, config.notify.missedMilestonesKey,
        users[1].email,
        {
          personalisation: {
            email_address: users[1].email,
            list: list.join(', '),
            link: config.serviceUrl
          },
          reference: `${users[1].id}`
        }
      );
    });
  });
});