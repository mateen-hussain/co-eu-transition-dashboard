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
const logger = require('services/logger');
const { Parser } = require('json2csv');

class CSVExport extends Page {
  get url() {
    return paths.csvExport;
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
    let data = [];

    for(var i = 0; i < 10; i ++) {
      data.push({
        name: `Item ${i+1}`,
        metric1: Math.floor(Math.random() * 10),
        metric2: Math.floor(Math.random() * 10)
      });
    }

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    res.set('Cache-Control', 'public, max-age=0');
    res.attachment('test.csv');
    res.status(200).send(csv);
  }

  async postRequest(req, res) {
    res.sendStatus(METHOD_NOT_ALLOWED);
  }
}


module.exports = CSVExport;

