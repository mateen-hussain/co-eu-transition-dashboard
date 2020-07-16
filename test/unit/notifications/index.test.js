const { sinon } = require('test/unit/util/chai');
const proxyquire = require('proxyquire');

const nodeCronStub = {
  schedule: sinon.stub()
};

const upcomingMilestonesStub = {
  notifyUpcomingMilestones: sinon.stub()
};

describe('notifications/index', () => {
  before(() => {
    proxyquire('notifications/index', {
      'node-cron': nodeCronStub,
      './upcomingMilestones': upcomingMilestonesStub
    });
  });

  it('runs upcoming milestones notification each day at 10am', () => {
    sinon.assert.calledWith(nodeCronStub.schedule, '0 0 10 * * *', upcomingMilestonesStub.notifyUpcomingMilestones)
  });
});