const Page = require('core/pages/page');
const { paths } = require('config');
const authentication = require('services/authentication');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const Project = require('models/project');
const Milestone = require('models/milestone');
const xl = require('excel4node');
const moment = require('moment');
const FieldEntryGroup = require('models/fieldEntryGroup');
const get = require('lodash/get');

class ProjectMilestoneTemplate extends Page {
  get url() {
    return paths.dataEntry.projectMilestoneTemplate;
  }

  get middleware() {
    return [
      ...authentication.protect(['admin'])
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

  createGroupHeaderCell(workbook, group, sheet, columnIndexStart, rowIndex, columnIndexEnd) {
    const style = workbook.createStyle({
      border: this.excelDefaultStyles.border,
      alignment: this.excelDefaultStyles.alignment,
      font: {
        bold: true,
        italics: true,
        color: get(group, 'config.exportOptions.group.color'),
        name: 'Arial',
        size: 10
      },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: get(group, 'config.exportOptions.group.fill')
      }
    });

    sheet.cell(rowIndex, columnIndexStart, rowIndex, columnIndexEnd, true)
      .string(group.name || '')
      .style(style);
  }

  createHeaderCell(workbook, sheet, options = {}, columnIndex, rowIndex, field) {
    const opts = {
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
      opts.fill = {
        type: 'pattern',
        patternType: 'solid',
        fgColor: options.fill
      };
    }

    const style = workbook.createStyle(opts);
    sheet.cell(rowIndex, columnIndex)
      .string(field.importColumnName || '')
      .style(style);
  }

  createDescriptionCell(workbook, sheet, options = {}, columnIndex, rowIndex, field) {
    const opts = {
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
      opts.fill = {
        type: 'pattern',
        patternType: 'solid',
        fgColor: options.fill
      };
    }

    const style = workbook.createStyle(opts);
    sheet.cell(rowIndex, columnIndex)
      .string(field.description || '')
      .style(style);
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

  addGroupValidation(workbook, sheet, columnIndex, rowIndex, field) {
    const firstCellRef = xl.getExcelCellRef(rowIndex, columnIndex);
    const lastCellRef = xl.getExcelCellRef(1000, columnIndex);

    if (field.type === 'group' || field.type === 'boolean') {
      const options = [];
      if(!field.isRequired) {
        options.push('N/A');
      }

      if (field.type === 'boolean') {
        options.push('Yes', 'No');
      } else if(field.config && field.config.options && field.config.options.length) {
        options.push(...field.config.options);
      }

      sheet.addDataValidation({
        type: 'list',
        allowBlank: true,
        error: 'Input must fall within specified range',
        showDropDown: true,
        sqref: `${firstCellRef}:${lastCellRef}`,
        formulas: [options.join(',')],
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
      cell
        .date(moment(value, 'DD/MM/YYYY').toDate())
        .style({ numberFormat: 'd/mm/yy' });
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

  async createProjectSheet(workbook) {
    const projectGroups = await FieldEntryGroup.findAll({
      order: ['order']
    });

    const projects = await this.req.user.getProjects();
    const projectFields = await Project.fieldDefintions(this.req.user);

    const projectSheet = workbook.addWorksheet('TAB A - Baseline data');

    let currentColumnIndex = 1;

    projectSheet.row(1).setHeight(28);
    projectSheet.row(2).setHeight(70);
    projectSheet.row(3).setHeight(234);

    projectGroups.forEach(group => {
      const fieldsForGroup = projectFields
        .filter(field => field.group === group.name)
        .sort((a, b) => a.order - b.order);

      if(!fieldsForGroup.length){
        return;
      }

      this.createGroupHeaderCell(workbook, group, projectSheet, currentColumnIndex, 1, currentColumnIndex + (fieldsForGroup.length - 1));

      fieldsForGroup.forEach((field, columnIndex) => {
        columnIndex += currentColumnIndex;

        projectSheet.column(columnIndex).setWidth(15);

        this.createHeaderCell(workbook, projectSheet, get(group, 'config.exportOptions.header'), columnIndex, 2, field);
        this.createDescriptionCell(workbook, projectSheet, get(group, 'config.exportOptions.description'), columnIndex, 3, field);
        this.createTypeCell(workbook, projectSheet, columnIndex, 4, field);
        this.addGroupValidation(workbook, projectSheet, columnIndex, 5, field);

        projects.forEach((project, rowIndex) => {
          rowIndex += 5;

          const attribute = project.fields.get(field.name) || {};
          this.addItem(workbook, projectSheet, columnIndex, rowIndex, field, attribute.value);
        });
      });

      currentColumnIndex += fieldsForGroup.length;
    });
  }

  async createMilestoneSheet(workbook) {
    const projects = await this.req.user.getProjects();

    const milestones = projects.reduce((milestones, project) => {
      return [...milestones, ...project.milestones];
    }, []);
    const milestoneFields = await Milestone.fieldDefintions();

    const milestoneSheet = workbook.addWorksheet('TAB B - Milestones data');

    let currentColumnIndex = 1;

    milestoneSheet.row(1).setHeight(70);
    milestoneSheet.row(2).setHeight(234);

    milestoneFields.forEach((field, columnIndex) => {
      columnIndex += currentColumnIndex;

      milestoneSheet.column(columnIndex).setWidth(15);

      this.createHeaderCell(workbook, milestoneSheet, get(field.config, 'exportOptions.header'), columnIndex, 1, field);
      this.createDescriptionCell(workbook, milestoneSheet, get(field.config, 'exportOptions.description'), columnIndex, 2, field);
      this.createTypeCell(workbook, milestoneSheet, columnIndex, 3, field);
      this.addGroupValidation(workbook, milestoneSheet, columnIndex, 4, field);

      milestones.forEach((milestone, rowIndex) => {
        rowIndex += 4;

        const attribute = milestone.fields.get(field.name) || {};
        this.addItem(workbook, milestoneSheet, columnIndex, rowIndex, field, attribute.value);
      });
    });
  }

  async createExcelTemplate(req, res) {
    const workbook = new xl.Workbook();

    await this.createProjectSheet(workbook);
    await this.createMilestoneSheet(workbook);

    const name = `OS_${moment().format('YYYY.MM.DD')}_Commission Sheet.xlsx`;

    workbook.write(name, res);
  }
}


module.exports = ProjectMilestoneTemplate;

