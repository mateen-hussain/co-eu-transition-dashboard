const { expect, sinon } = require('test/unit/util/chai');
const xlsx = require('xlsx');
const xlsxService = require('services/xlsx');

describe('services/xlsx', () => {
  describe('#parse', () => {
    let sampleExcelDocument = {};
    beforeEach(() => {
      sampleExcelDocument = {
        Sheets: {
          Projects: {
            '!ref': 'A1:A4',
            'A1': {
              t: 's',
              v: 'UID'
            },
            'A2': {
              t: 's',
              v: '[Set by CO]'
            },
            'A3': {
              t: 's',
              v: 'unique id 1',
            },
            'A4': {
              t: 's',
              v: 'unique id 2',
            }
          },
          Milestones: {
            '!ref': 'A1:A4',
            'A1': {
              t: 's',
              v: 'Project UID'
            },
            'A2': {
              t: 's',
              v: 'The UID of the project these milestones cover'
            },
            'A3': {
              t: 's',
              v: 'unique id 1',
            },
            'A4': {
              t: 's',
              v: 'unique id 2',
            }
          }
        }
      };
      sinon.stub(xlsx, 'read').returns(sampleExcelDocument);
    });

    afterEach(() => {
      xlsx.read.restore();
    });

    it('should convert an excel document into a collection', () => {
      const collection = xlsxService.parse(sampleExcelDocument)
      sinon.assert.calledWith(xlsx.read, sampleExcelDocument, { cellDates: true });
      expect(collection).to.eql([
        {
          name: 'Projects',
          data: [{ UID: 'unique id 1' }, { UID: 'unique id 2' }]
        }, {
          name: 'Milestones',
          data: [{ 'Project UID': 'unique id 1' }, { 'Project UID': 'unique id 2' }]
        }
      ]);
    });

    it('only parses expected sheets', () => {
      sampleExcelDocument.Sheets = {
        someSheet: {
          '!ref': 'A1:A4',
          'A1': {
            t: 's',
            v: 'UID'
          }
        }
      };

      const collection = xlsxService.parse(sampleExcelDocument)
      sinon.assert.calledWith(xlsx.read, sampleExcelDocument, { cellDates: true });
      expect(collection).to.eql([]);
    });
  });

  describe('#getRange', () => {
    it('returns correct range for cells with data', () => {
      const sheetData = {
        '!ref': 'A1:B2',
        'A1': {},
        'B1': { v: 'Project UID' },
        'A2': {},
        'B2': {},
        '!meta': { foo: 'bar' }
      }
      expect(xlsxService.getRange(sheetData)).to.eql('B1:B2');
    });
  });
});