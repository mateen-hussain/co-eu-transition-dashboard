const { expect } = require('test/unit/util/chai');
const { STRING, DATE } = require('sequelize');
const Milestones = require('models/milestones');

describe('models/milestones', () => {
  it('called Milestones.init with the correct parameters', () => {
    expect(Milestones.init).to.have.been.calledWith({
      milestone_uid: STRING,
      description: STRING,
      due_date: DATE,
      last_comment: STRING
    });
  });
});