const measures = require('helpers/measures');
// const updatedMeasures = require('notifications/updatedMeasures');
const { notify } = require('config');
const { sinon } = require('test/unit/util/chai');
const notifyServices =require('services/notify');
const proxyquire = require('proxyquire');

let updatedMeasures = {};
let fnStub = sinon.stub();

const sequelizeStub = {
  fn: fnStub,
  Op: {
    gte: 'gte'
  }
}

const mockUpdatedMeasures = [{
  id: 948,
  publicId: '44444444',
  theme: 'Borders',
  name: 'Project 4444444',
  description: 'Description of project 4',
  unit: '#',
  value: 444,
  redThreshold: 2,
  aYThreshold: 4,
  greenThreshold: 6,
  groupBy: 'none'
},
{
  id: 949,
  publicId: '5555555',
  theme: 'Borders',
  name: 'Project 555555',
  description: 'Description of project 5',
  unit: '#',
  value: 555,
  redThreshold: 1000,
  aYThreshold: 2000,
  greenThreshold: 3000,
  groupBy: 'none'
}]
const mockMailingList = '1@email.com;2@email.com';
const formattedMeasres = " * Borders  Project 4444444  Description of project 4 * Borders  Project 555555  Description of project 5";

describe('notifications/updatedMeasures', () => {
  
  let getCategoryStub ;

  before(() => {
    updatedMeasures = proxyquire('notifications/updatedMeasures', {
      'sequelize': sequelizeStub
    });
  });

  beforeEach(()=>{
    notify.updatedMeasures.mailingList= mockMailingList;
    sinon.stub(measures, 'getMeasureEntities').returns(mockUpdatedMeasures);
    getCategoryStub = sinon.stub(measures, 'getCategory')
    sinon.stub(notifyServices, 'sendMeasuresUpdatedTodayEmail').returns();
    getCategoryStub.onFirstCall().returns({ id: 'some-measure' });
    getCategoryStub.onSecondCall().returns({ id: 'some-measure' });
    fnStub.returns();
  })

  afterEach(()=>{
    measures.getCategory.restore();
    measures.getMeasureEntities.restore();
    // sequelize.fn().restore();
    getCategoryStub.restore();
  })

  describe('#notifyUpdatedMeasures', () => {
    it('gets updated measures and calls notify', async () => {

      await updatedMeasures.notifyUpdatedMeasures();

      sinon.assert.calledWith(notifyServices.sendMeasuresUpdatedTodayEmail, {
        emails: ['1@email.com', '2@email.com'],
        measures: formattedMeasres
      });
    })
  });

});



