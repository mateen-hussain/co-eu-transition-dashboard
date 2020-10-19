const { Router } = require('express');
const path = require('path');
const jwt = require('services/jwt');
const { protect } = require('services/authentication');
const config = require('config');
const { removeNulls } = require('helpers/utils');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');

const notLocals = [
  '_router',
  'journey',
  'constructor',
  'form',
  'locals',
  'middleware',
  'handler'
];

const notDefined = val => typeof val === 'undefined' || val === null;
const defined = val => !notDefined(val);

const allProperties = (obj, arr = []) => {
  if (notDefined(obj)) {
    return arr;
  }
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const props = [
    ...Object.keys(descriptors).map(key => {
      return { key, descriptor: descriptors[key] };
    }),
    ...arr
  ];
  return allProperties(Object.getPrototypeOf(obj), props);
};

class Page {
  constructor(path, req, res) {
    this.path = path;
    this.req = req;
    this.res = res;
  }

  static get isEnabled() {
    return true;
  }

  get url() {
    return '/';
  }

  get middleware() {
    return [...protect([])];
  }

  get template() {
    return path.join(this.path, `${this.constructor.name}.html`);
  }

  get schema() {
    return {}
  }

  get data() {
    const data = jwt.restoreData(this.req, this.res) || {};
    return data[this.constructor.name] || this.schema;
  }

  getRequest(req, res) {
    res.render(this.template, Object.assign(this.locals, { config } ));
  }

  saveData(data = {}, keepExistingData) {
    const _data = { [this.constructor.name]: data };
    jwt.saveData(this.req, this.res, _data, keepExistingData);
  }

  clearData() {
    this.saveData();
  }

  next() {
    this.res.redirect(this.url);
  }

  async postRequest(req) {
    this.saveData(removeNulls(req.body));

    this.next();
  }

  renderRequest(res, viewData = {}) {
    res.render(this.template, Object.assign(this.locals, { config, ...viewData } ));
  }

  async handler(req, res) {
    this.req = req;
    this.res = res;

    const method = req.method.toLowerCase();

    switch (method) {
    case 'post':
      await this.postRequest(req, res);
      break;
    case 'get':
      await this.getRequest(req, res);
      break;
    default:
      res.sendStatus(METHOD_NOT_ALLOWED);
    }
  }

  get pathToBind() {
    return this.url;
  }

  get router() {
    this._router = Router();
    this._router.page = this;

    this.middleware.forEach(middleware => {
      this._router.use(this.pathToBind, middleware.bind(this));
    });

    this._router.use(this.pathToBind, this.handler.bind(this));

    return this._router;
  }

  get locals() {
    return allProperties(this)
      .filter(({ key }) => !(notLocals.includes(key)))
      .reduce((obj, { key, descriptor }) => {
        if (typeof descriptor.value === 'function') {
          obj[key] = descriptor.value.bind(this);
        } else if (defined(descriptor.value)) {
          obj[key] = this[key];
        } else if (defined(descriptor.get) && key !== '__proto__') {
          Object.assign(obj, {
            [key]: this[key]
          });
        }

        return obj;
      }, {});
  }

  get countDownTime() {
    const second = 1000,
      minute = second * 60,
      hour = minute * 60,
      day = hour * 24;

    const finalTransitionDate = new Date('Jan 01, 2021 00:00:00').getTime();
    const distance = finalTransitionDate - new Date().getTime();

    let daysToDate = Math.floor(distance / day);

    if (distance < 0) {
      daysToDate = 0;
    }

    return daysToDate;
  }
}

module.exports = Page;