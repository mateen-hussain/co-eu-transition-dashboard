const { expect } = require('test/unit/util/chai');
const Category = require('models/category');
const EntityFieldEntry = require('models/entityFieldEntry');
const measures = require('helpers/measures')

describe('helpers/measures', () => {
  describe('#applyLabelToEntities', () => {
    it('Should create label with filtervalue and filtervalue2 when both filter and filter2 exist', async () => {
      const measureEntities = [{ filter: 'filter1', filterValue: 'value1', filter2: 'filter2', filterValue2: 'value2' }];
      measures.applyLabelToEntities(measureEntities);
      expect(measureEntities[0].label).to.eql('filter1 : value1');
      expect(measureEntities[0].label2).to.eql('filter2 : value2');
    });

    it('Should create label with filtervalue if only filter exists', async () => {
      const measureEntities = [{ filter: 'filter1', filterValue: 'value1' }];
      measures.applyLabelToEntities(measureEntities);
      expect(measureEntities[0].label).to.eql('filter1 : value1');
    });

    it('Should not create label when there are no filters', async () => {
      const measureEntities = [{ other: 'other values', }];
      measures.applyLabelToEntities(measureEntities);
      expect(measureEntities[0].label).not.to.exist;
    });
  });

  describe('#calculateUiInputs', () => {
    it('should filter list of entities by date and return data for unique entities when filter and filter2 are set', async () => {
      const measureEntities = [
        { metricID: 'metric1', date: '05/10/2020', filter: 'country', filterValue: 'england', filter2: 'area', filterValue2: 'north', value: 10 },
        { metricID: 'metric1', date: '05/10/2020', filter: 'country', filterValue: 'england', filter2: 'area', filterValue2: 'north', value: 5 },
      ];

      const response = await measures.calculateUiInputs(measureEntities);
      expect(response).to.eql([measureEntities[0]]);
    });

    it('should filter list of entities by date and return data for unique entities when only filter is set', async () => {
      const measureEntities = [
        { metricID: 'metric1', date: '05/10/2020', filter: 'country', filterValue: 'england', value: 100 },
        { metricID: 'metric1', date: '05/10/2020', filter: 'country', filterValue: 'england', value: 50 },
      ];
      const response = await measures.calculateUiInputs(measureEntities);
      expect(response).to.eql([measureEntities[0]]);
    });

    it('should filter list of entities by date and return data for unique entities when neither filter or filter2 is set', async () => {
      const measureEntities = [
        { metricID: 'metric1', date: '05/10/2020', value: 20 },
        { metricID: 'metric1', date: '05/10/2020', value: 10 },
      ];
      const response = await measures.calculateUiInputs(measureEntities);
      expect(response).to.eql([measureEntities[0]]);
    });
  });

  describe('#getEntityFields', () => {
    it('gets entity fields', async () => {
      const entityFieldEntries = [{ entityfieldEntry: { value: 'new value', categoryField: { name: 'test' } } }];
      EntityFieldEntry.findAll.resolves(entityFieldEntries);

      const response = await measures.getEntityFields('measure-1');

      expect(response).to.eql(entityFieldEntries);
    });

    it('returns error when no entity fields data ', async () => {
      EntityFieldEntry.findAll.resolves();

      let error = {};
      try {
        await measures.getEntityFields('measure-1');
      } catch (err) {
        error = err.message;
      }

      expect(error).to.eql('EntityFieldEntry export, error finding entityFieldEntries');
    });
  });

  describe('#getCategory', () => {
    it('gets and returns category', async () => {
      const category = { name: 'Theme' };
      Category.findOne.resolves(category);

      const response = await measures.getCategory('Theme');

      expect(response).to.eql(category);
    });

    it('gets and returns category', async () => {
      Category.findOne.resolves();

      let error = {};
      try {
        await measures.getCategory();
      } catch (err) {
        error = err.message;
      }

      expect(error).to.eql('Category export, error finding Measure category');
    });
  });


});
