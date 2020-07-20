const Page = require('core/pages/page');
const { Router } = require('express');

class PageNotFound extends Page {
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