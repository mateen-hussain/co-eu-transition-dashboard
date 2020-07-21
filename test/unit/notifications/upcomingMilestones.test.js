const { sinon, expect } = require('test/unit/util/chai');
const User = require("models/user");
const Department = require("models/department");
const proxyquire = require('proxyquire');
const config = require('config');
const moment = require('moment');
const sequelize = require('services/sequelize');

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
        milestones: [{ uid: '123' }]
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
        `${projectsByDepartment['department1'][0].title} - ${projectsByDepartment['department1'][0].milestones[0].uid}`
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

  describe('#setLock', () => {
    it('should set lock with a uuid', async () => {
      const guid = await upcomingMilestones.setLock();
      const options = {
        replacements: [ guid, config.locks.upcomingMilestonesNotifications ]
      };
      sinon.assert.calledWith(sequelize.query, `UPDATE dashboard_locks SET guid=? WHERE name=? AND guid IS NULL`, options)
    })
  });

  describe('#getLock', () => {
    it('should return false if guid does not match', async () => {
      const guid = 'some guid';
      sequelize.query.resolves([[], []]);

      const response = await upcomingMilestones.getLock(guid);

      expect(response).to.not.be.ok;
    });

    it('should return true if guid does match', async () => {
      const guid = 'some guid';
      sequelize.query.resolves([[{}], [{}]]);

      const response = await upcomingMilestones.getLock(guid);

      expect(response).to.be.ok;

      const options = {
        replacements: [ guid, config.locks.upcomingMilestonesNotifications ]
      };
      sinon.assert.calledWith(sequelize.query, 'SELECT * FROM dashboard_locks WHERE guid=? AND name=?', options)
    });
  });

  describe('#clearLock', () => {
    it('should clear the lock', async () => {
      await upcomingMilestones.clearLock();
      const options = {
        replacements: [ config.locks.upcomingMilestonesNotifications ]
      };
      sinon.assert.calledWith(sequelize.query, `UPDATE dashboard_locks SET guid=NULL WHERE name=?`, options)
    });
  });

  describe('#sendSummaryNotification', () => {
    it('should send email summerising notifications', async () => {
      const summary = {
        infos: ['some info', 'some info2'],
        errors: ['errors 1', 'errors 2']
      };

      await upcomingMilestones.sendSummaryNotification(summary);

      sinon.assert.calledWith(sendEmailStub,
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
    });
  });
});



