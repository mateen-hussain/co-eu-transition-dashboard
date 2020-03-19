const helmetModule = require('helmet');
const helmet = require('middleware/helmet');
const { expect, sinon } = require('test/unit/util/chai');

const app = {};

describe('middleware/helmet', () => {
  beforeEach(() => {
    app.use = sinon.stub();
  });

  describe('#attach', () => {
    it('adds core helmet to app middleware', () => {
      helmet.attach(app);
      expect(app.use.firstCall.args.toString()).to.eql(helmetModule().toString());
    });

    it('adds contentSecurityPolicy helmet to app middleware', () => {
      const contentSecurityPolicyStub = sinon.stub(helmetModule, 'contentSecurityPolicy');
      helmet.attach(app);

      sinon.assert.calledWith(contentSecurityPolicyStub, {
        directives: {
          fontSrc: ['\'self\' data:'],
          scriptSrc: [
            '\'self\'',
            '\'unsafe-eval\'',
            '\'unsafe-inline\'',
            'www.google-analytics.com'
          ],
          connectSrc: ['\'self\''],
          mediaSrc: ['\'self\''],
          frameSrc: [
            '\'none\''
          ],
          imgSrc: [
            '\'self\'',
            '\'self\' data:',
            'www.google-analytics.com'
          ]
        }
      });

      contentSecurityPolicyStub.restore();
    });

    it('adds referrerPolicy helmet to app middleware', () => {
      const referrerPolicyStub = sinon.stub(helmetModule, 'referrerPolicy');
      helmet.attach(app);

      sinon.assert.calledWith(referrerPolicyStub, { policy: 'origin' });

      referrerPolicyStub.restore();
    });
  });
});