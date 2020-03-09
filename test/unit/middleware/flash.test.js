// const jwt = require('services/jwt');

// const flash = (req, res, next) => {
//   const data = jwt.restoreData(req);

//   if (data.flash) {
//     res.locals = res.locals || {};
//     res.locals.flash = data.flash;
//     jwt.saveData(req, res, { flash: undefined });
//   }

//   req.flash = message => {
//     return jwt.saveData(req, res, { flash: message });
//   };

//   next();
// };

// module.exports = flash;

const { expect, sinon } = require('test/unit/util/chai');
const flash = require('middleware/flash');
const jwt = require('services/jwt');

let req = {};
let res = {};
let next = {};

describe('middleware/flash', () => {
  beforeEach(() => {
    sinon.stub(jwt, 'restoreData');
    sinon.stub(jwt, 'saveData');
    req = {};
    res = { locals: {} };
    next = sinon.stub();
  });

  afterEach(() => {
    jwt.restoreData.restore();
    jwt.saveData.restore();
  });

  it('loads flash if exsists in jwt', () => {
    const data = { flash: 'some flash message' };
    jwt.restoreData.returns(data);

    flash(req, res, next);

    sinon.assert.calledWith(jwt.restoreData, req);
    sinon.assert.calledWith(jwt.saveData, req, res, { flash: undefined });

    expect(res.locals.flash).to.eql('some flash message');
  });

  it('does not load flash if it doesnt exsists in jwt', () => {
    const data = {};
    jwt.restoreData.returns(data);

    flash(req, res, next);

    sinon.assert.calledWith(jwt.restoreData, req);
    sinon.assert.notCalled(jwt.saveData);

    expect(res.locals.flash).to.be.undefined;
  });

  it('adds function to save flash', () => {
    const data = {};
    jwt.restoreData.returns(data);

    flash(req, res, next);

    req.flash('some flash');

    sinon.assert.calledWith(jwt.saveData, req, res, { flash: 'some flash' });
  });
})