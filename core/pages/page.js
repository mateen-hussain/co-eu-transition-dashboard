const { Router } = require('express');
const path = require('path');
const jwt = require('services/jwt');

const notLocals = [
  '_router',
  'journey',
  'constructor',
  'form',
  'next',
  'locals',
  'middleware',
  'handler',
  'req',
  'res'
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
  if (obj.name === 'BaseStep') {
    return props;
  }
  return allProperties(Object.getPrototypeOf(obj), props);
};

class Page {
  constructor(path, req, res) {
    this.path = path;
    this.req = req;
    this.res = res;
  }

  get url() {
    return '/';
  }

  get middleware() {
    return [];
  }

  get template() {
    return path.join(this.path, `${this.constructor.name}.html`);
  }

  get data() {
    const data = jwt.restoreData(this.req) || {};
    return data[this.constructor.name] || {};
  }

  getRequest(req, res) {
    res.render(this.template, this.locals);
  }

  async postRequest(req, res) {
    const data = { [this.constructor.name]: removeNulls(req.body) };

    function removeNulls(obj){
      var isArray = obj instanceof Array;
      for (var k in obj){
        if (obj[k] === null || (typeof obj[k] === "string" && !obj[k].length)) {
          if(isArray) {
            obj.splice(k,1);
          } else {
            delete obj[k];
          }
        } else if (typeof obj[k] === "object") {
          obj[k] = removeNulls(obj[k]);
        } else if (!isNaN(obj[k])) {
          obj[k] = parseInt(obj[k]);
        }
      }
      return obj;
    }

    jwt.saveData(req, res, data);

    res.redirect(this.url);
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
      default:
        await this.getRequest(req, res);
    }
  }

  get router() {
    this._router = Router();
    this._router.page = this;

    this.middleware.forEach(middleware => {
      this._router.use(this.url, middleware.bind(this));
    });

    this._router.use(this.url, this.handler.bind(this));

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
}

module.exports = Page;