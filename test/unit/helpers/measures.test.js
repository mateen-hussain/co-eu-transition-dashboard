const { expect, sinon } = require('test/unit/util/chai');
const Category = require('models/category');
const EntityFieldEntry = require('models/entityFieldEntry');
const measures = require('helpers/measures')
const parse = require('helpers/parse');
const validation = require('helpers/validation');

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

  describe('#getMeasureEntitiesFromGroup', () => {

    it('should return filter data which only contains the same metric, sorted by date', async () => {
      const measure1 = { name: 'test1', metricID: 'measure-1', date: '05/10/2020' }
      const measure2 = { name: 'test2', metricID: 'measure-2', date: '05/10/2020' }
      const measure3 = { name: 'test3', metricID: 'measure-1', date: '04/10/2020' }
      const groupEntities = [measure1, measure2, measure3];
      const response =  measures.getMeasureEntitiesFromGroup(groupEntities, 'measure-1');

      expect(response).to.eql([ measure3, measure1 ]);
    });
  });

  describe('#validateFormData', () => {
    beforeEach(() => {
      sinon.stub(measures, 'calculateUiInputs').returns([{ id: 123 }, { id: 456 }]);
    });

    afterEach(() => {
      measures.calculateUiInputs.restore();
    });

    it('should return an error when date is not valid', async () => {
      const formData = { day: '10', month: '14', year: '2020', entities:{} };

      const response = await measures.validateFormData(formData);
      expect(response[0]).to.eql("Invalid date");
    });

    it('should return an error when date already exists', async () => {
      const formData = { day: '05', month: '10', year: '2020', entities:{} };
      const measuresEntities = [{ metricID: 'metric1', date: '05/10/2020', value: 2 }];

      const response = await measures.validateFormData(formData, measuresEntities);
      expect(response[0]).to.eql("Date already exists");
    });

    it('should return an error when no entities data is present', async () => {
      const formData = { day: '10', month: '12', year: '2020' };
      const response = await measures.validateFormData(formData);
      expect(response[0]).to.eql("Missing entity values");
    });

    it('should return an error when entities data is empty', async () => {
      const formData = { day: '10', month: '12', year: '2020', entities: {} };
      const response = await measures.validateFormData(formData);
      expect(response[0]).to.eql("You must submit at least one value");
    });

    it('should return an error when entities data is empty', async () => {
      const formData = { day: '10', month: '12', year: '2020', entities:{ 123: '', 456: 10 } };
      const response = await measures.validateFormData(formData);
      expect(response[0]).to.eql("Invalid field value");
    });

    it('should return an error when entities data is NaN', async () => {
      const formData = { day: '10', month: '12', year: '2020', entities:{ 123: 'hello', 456: 10 } };
      const response = await measures.validateFormData(formData);
      expect(response[0]).to.eql("Invalid field value");
    });

    it('should return an empty array when data is valid', async () => {
      const formData = { day: '10', month: '12', year: '2020', entities:{ 123: 5, 456: 10 } };
      const response = await measures.validateFormData(formData);
      expect(response.length).to.eql(0);
    });
  });


  describe('#validateEntities', () => {
    const categoryFields = [{ id: 1 }];

    beforeEach(() => {
      sinon.stub(Category, 'fieldDefinitions').returns(categoryFields);
      sinon.stub(validation, 'validateItems');
      sinon.stub(parse, 'parseItems')
    });

    afterEach(() => {
      parse.parseItems.restore();
      validation.validateItems.restore();
      Category.fieldDefinitions.restore();
    });

    it('rejects if no entities found', async () => {
      parse.parseItems.returns([]);
      validation.validateItems.returns([])
      const response = await measures.validateEntities();
      expect(response.errors).to.eql([{ error: 'No entities found' }]);
    });

    it('validates each item parsed', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      const parsedItems = [{ foo: 'bar' }];
      parse.parseItems.returns(parsedItems);
      validation.validateItems.returns([])

      const response = await measures.validateEntities(items);

      expect(response).to.eql({ errors: [], parsedEntities: [ { foo: 'bar' } ] });
      sinon.assert.calledWith(validation.validateItems, parsedItems, categoryFields);
    });
  });


});
