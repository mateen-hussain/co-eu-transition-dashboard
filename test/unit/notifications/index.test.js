const { sinon, expect } = require('test/unit/util/chai');
const proxyquire = require('proxyquire');

const scheduleStub = sinon.stub();
const nodeCronStub = {
  schedule: scheduleStub
};

const upcomingMilestonesStub = {
  notifyUpcomingMilestones: sinon.stub()
};

const updatedMeasuresStub = {
  notifyUpdatedMeasures: sinon.stub()
};

describe('notifications/index', () => {
  before(() => {
    proxyquire('notifications/index', {
      'node-cron': nodeCronStub,
      './upcomingMilestones': upcomingMilestonesStub,
      './updatedMeasures': updatedMeasuresStub
    });
  });

  it('runs upcoming milestones notification each day at 10am', () => {
    expect(scheduleStub.getCall(0).calledWith('0 0 10 * * *',upcomingMilestonesStub.notifyUpcomingMilestones)).to.be.true;
  });

  it('runs updatedMeasures notification each day at 3:15 pm', () => {
    expect(scheduleStub.getCall(1).calledWith('0 5 15 * * *',updatedMeasuresStub.notifyUpdatedMeasures)).to.be.true;
  });
});