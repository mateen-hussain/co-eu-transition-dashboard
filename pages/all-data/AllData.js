const { Router } = require('express');
const path = require('path');
const Page = require('../../core/pages/page');
const { paths } = require('config');
const database = require('../../services/database');

class AllData extends Page {
  get url() {
    return paths.allData;
  }

  async projects() {
    return await database.getProjects();
  }
}

module.exports = AllData;