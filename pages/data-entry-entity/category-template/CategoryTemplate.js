const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const Category = require('models/category');
const Entity = require('models/entity');
const EntityFieldEntry = require('models/entityFieldEntry');
const xl = require('excel4node');
const moment = require('moment');
const get = require('lodash/get');
const logger = require('services/logger');

class CategoryTemplate extends Page {
  get url() {
    return paths.dataEntryEntity.categoryTemplate;
  }

  get middleware() {
    return [
      ...authentication.protect(['uploader'])
    ];
  }

  userFriendlyType(type) {
    switch(type){
    case 'integer':
    case 'float':
      return 'Number';
    case 'date':
      return 'Date';
    case 'group':
    case 'boolean':
      return 'Drop down';
    case 'string':
    default:
      return 'Free text';
    }
  }

  async getRequest(req, res) {
    this.createExcelTemplate(req, res);
  }

  async postRequest(req, res) {
    res.sendStatus(METHOD_NOT_ALLOWED);
  }

  get excelDefaultStyles() {
    return {
      border: {
        left: {
          style: 'thin',
          color: '000000'
        },
        right: {
          style: 'thin',
          color: '000000'
        },
        top: {
          style: 'thin',
          color: '000000'
        },
        bottom: {
          style: 'thin',
          color: '000000'
        }
      },
      alignment: {
        horizontal: ['center'],
        vertical: ['top'],
        wrapText: true
      }
    };
  }

  createHeaderCell(workbook, sheet, options = {}, columnIndex, rowIndex, field) {
    const style = {
      border: this.excelDefaultStyles.border,
      alignment: this.excelDefaultStyles.alignment,
      font: {
        bold: true,
        color: options.color,
        name: 'Arial',
        size: 10
      }
    };

    if(options.fill) {
      style.fill = {
        type: 'pattern',
        patternType: 'solid',
        fgColor: options.fill
      };
    }

    sheet.cell(rowIndex, columnIndex)
      .string(field.displayName || '')
      .style(workbook.createStyle(style));
  }

  createDescriptionCell(workbook, sheet, options = {}, columnIndex, rowIndex, field) {
    const style = {
      border: this.excelDefaultStyles.border,
      alignment: this.excelDefaultStyles.alignment,
      font: {
        italics: true,
        color: options.color,
        size: 9,
        name: 'Arial'
      }
    };

    if(options.fill) {
      style.fill = {
        type: 'pattern',
        patternType: 'solid',
        fgColor: options.fill
      };
    }

    sheet.cell(rowIndex, columnIndex)
      .string(field.description || '')
      .style(workbook.createStyle(style));
  }

  createTypeCell(workbook, sheet, columnIndex, rowIndex, field) {
    const style = workbook.createStyle({
      border: this.excelDefaultStyles.border,
      alignment: this.excelDefaultStyles.alignment,
      font: {
        bold: true,
        name: 'Arial',
        size: 10
      }
    });

    sheet.cell(rowIndex, columnIndex)
      .string(`[${this.userFriendlyType(field.type)}]`)
      .style(style);
  }

  addGroupValidation(workbook, validationSheet, sheet, columnIndex, rowIndex, field) {
    const firstCellRef = xl.getExcelCellRef(rowIndex, columnIndex);
    const lastCellRef = xl.getExcelCellRef(1000, columnIndex);

    let validationSheetCurrentColumn = 1;
    let cell = validationSheet.cell(1, validationSheetCurrentColumn);

    while (get(cell, 'cells[0].v') !== null) {
      validationSheetCurrentColumn ++;
      cell = validationSheet.cell(1,validationSheetCurrentColumn);
      if (validationSheetCurrentColumn > 100000) {
        throw new Error('Unable to find next validation sheet column');
      }
    }

    if (field.type === 'group' || field.type === 'boolean') {
      let options = [];
      if(!field.isRequired) {
        options.push('N/A');
      }

      if (field.type === 'boolean') {
        options.push('Yes', 'No');
      } else if(field.config && field.config.options && field.config.options.length) {
        options.push(...field.config.options);
      }

      validationSheet
        .cell(1, validationSheetCurrentColumn)
        .string(`${field.displayName} Options`);

      options.forEach((option, validationRowIndex) => {
        validationSheet
          .cell(validationRowIndex + 2, validationSheetCurrentColumn)
          .string(String(option) || '');
      });

      const validationFirstCellRef = `$${xl.getExcelAlpha(validationSheetCurrentColumn)}$2`;
      const validationLastCellRef = `$${xl.getExcelAlpha(validationSheetCurrentColumn)}$${options.length + 1}`;

      sheet.addDataValidation({
        type: 'list',
        allowBlank: 1,
        sqref: `${firstCellRef}:${lastCellRef}`,
        formulas: [`='FOR INFO drop down data'!${validationFirstCellRef}:${validationLastCellRef}`],
      });
    }
  }

  addItem(workbook, sheet, columnIndex, rowIndex, field, value) {
    const style = workbook.createStyle({
      border: this.excelDefaultStyles.border,
      alignment: {
        wrapText: true,
        horizontal: ['left'],
        vertical: ['top']
      },
      font: {
        size: 10,
        name: 'Arial'
      }
    });

    const cell = sheet.cell(rowIndex, columnIndex)
      .style(style);

    if(value === undefined || value === null) {
      return;
    }

    switch(field.type) {
    case 'integer':
      cell.number(parseInt(value));
      break;
    case 'float':
      cell.number(parseFloat(value));
      break;
    case 'date':
      if(moment(value, 'DD/MM/YYYY').isValid()) {
        cell
          .date(moment(value, 'DD/MM/YYYY').toDate())
          .style({ numberFormat: 'd/mm/yy' });
      }
      break;
    case 'boolean':
      cell.string(value === true ? 'Yes' : 'No');
      break;
    case 'group':
    case 'string':
    default:
      cell.string(value);
    }
  }

  async createCategorySheet(category, workbook, entitySheet, validationSheet) {
    const categoryFields = await Category.fieldDefinitions(category.name);

    const entities = await Entity.findAll({
      where: {
        categoryId: category.id
      },
      include: [{
        model: EntityFieldEntry
      },{
        model: Entity,
        as: 'parents',
        include: Category
      }]
    });

    let currentColumnIndex = 1;

    entitySheet.row(1).setHeight(70);
    entitySheet.row(2).setHeight(234);

    categoryFields.forEach((field, columnIndex) => {
      columnIndex += currentColumnIndex;

      entitySheet.column(columnIndex).setWidth(15);

      this.createHeaderCell(workbook, entitySheet, get(field.config, 'exportOptions.header'), columnIndex, 1, field);
      this.createDescriptionCell(workbook, entitySheet, get(field.config, 'exportOptions.description'), columnIndex, 2, field);
      this.createTypeCell(workbook, entitySheet, columnIndex, 3, field);
      this.addGroupValidation(workbook, validationSheet, entitySheet, columnIndex, 4, field);

      entities.forEach((entity, rowIndex) => {
        rowIndex += 4;
        let value;

        const parentFieldNames = entity.parents.map(parent => Category.parentPublicIdString(parent.category));

        if(field.name === 'publicId') {
          value = entity.publicId;
        } else if(parentFieldNames.includes(field.name)) {
          const parent = entity.parents.find(parent => {
            return Category.parentPublicIdString(parent.category) === field.name
          });

          value = parent.publicId;
        } else {
          const entityfieldEntry = entity.entityFieldEntries.find(entityfieldEntry => entityfieldEntry.categoryFieldId === field.id);
          if(entityfieldEntry) {
            value = entityfieldEntry.value;
          }
        }

        this.addItem(workbook, entitySheet, columnIndex, rowIndex, field, value);
      });
    });
  }

  async createExcelTemplate(req, res) {
    const categoryName = req.query.category;

    const category = await Category.findOne({
      where: {
        name: categoryName
      }
    });

    if(!category) {
      logger.error(`Category export, error finding category: ${categoryName}`);
      return res.send(`Category export, error finding category: ${categoryName}`);
    }

    const workbook = new xl.Workbook();
    const name = `OS_${moment().format('YYYY.MM.DD')}_${category.name}.xlsx`;

    try {
      const entitySheet = workbook.addWorksheet(category.name);
      const validationSheet = workbook.addWorksheet('FOR INFO drop down data');

      await this.createCategorySheet(category, workbook, entitySheet, validationSheet);

      workbook.write(name, res);
    } catch (error) {
      logger.error(`Error exporting category template: ${error}`);
      res.send(`Error exporting category template: ${error}`);
      throw error;
    }
  }
}

module.exports = CategoryTemplate;