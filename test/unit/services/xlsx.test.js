const { expect, sinon } = require('test/unit/util/chai');
const xlsx = require('node-xlsx');
const xlsxService = require('services/xlsx');

const sampleDocument = [{ data: [['header 1', 'header 2', 'header 3'], ['item 1', 'item 2', 'item 3']] }];

describe('services/xlsx', () => {
  beforeEach(() => {
    sinon.stub(xlsx, 'parse').returns(sampleDocument);
  });

  afterEach(() => {
    xlsx.parse.restore();
  });

  it('should convert an excel document into a collection', () => {
    const collection = xlsxService.parse(sampleDocument);
    expect(collection[0]).to.eql([{ 'header 1': 'item 1', 'header 2': 'item 2', 'header 3': 'item 3' }]);
  });
});