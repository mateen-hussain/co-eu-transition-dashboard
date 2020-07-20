const Page = require('core/pages/page');
const { Router } = require('express');

class PageNotFound extends Page {
  // do not attach pageNotFound to the global router or all pages will redirect to it
  // this page is manually added in app.js
  static get isEnabled() {
    return false;
  }

  // page-not-found page does not require user authentication
  get middleware() {
    return [];
  }

  get router() {
    this._router = Router();
    this._router.page = this;

    this.middleware.forEach(middleware => {
      this._router.use(middleware.bind(this));
    });

    this._router.use(this.handler.bind(this));

    return this._router;
  }
}

module.exports = PageNotFound;