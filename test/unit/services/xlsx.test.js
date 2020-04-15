const { expect, sinon } = require('test/unit/util/chai');
const xlsx = require('xlsx');
const xlsxService = require('services/xlsx');

const sampleDocument = { Sheets: { sheet1: { foo: 'foo', bar: 'bar' }, sheet2: { baz: 'baz' } } };

describe('services/xlsx', () => {
  beforeEach(() => {
    sinon.stub(xlsx.utils, 'sheet_to_json').returnsArg(0);
    sinon.stub(xlsx, 'read').returns(sampleDocument);
  });

  afterEach(() => {
    xlsx.read.restore();
    xlsx.utils.sheet_to_json.restore();
  });

  it('should convert an excel document into a collection', () => {
    const collection = xlsxService.parse(sampleDocument)
    sinon.assert.calledWith(xlsx.read, sampleDocument, { cellDates: true });
    sinon.assert.calledTwice(xlsx.utils.sheet_to_json);
    expect(collection).to.eql([{ foo: 'foo', bar: 'bar' }, { baz: 'baz' }]);
  });
});