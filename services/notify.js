const NotifyClient = require('notifications-node-client').NotifyClient;
const logger = require('services/logger');
const { notify, serviceUrl } = require('config');
const get = require('lodash/get');

const ERROR_SENDING_EMAIL_MESSAGE="ERROR_SENDING_EMAIL";
const API_KEY_NOT_SET_MESSAGE = "No notify API key set";

const sendEmailWithTempPassword = async ({ email, userId, password }) => {
  if (!notify.apiKey) {
    logger.error(API_KEY_NOT_SET_MESSAGE)
    throw new Error(ERROR_SENDING_EMAIL_MESSAGE);
  }

  try {
    const notifyClient = new NotifyClient(notify.apiKey);

    await notifyClient.sendEmail(
      notify.createTemplateKey,
      email,
      {
        personalisation: {
          password,
          email,
          link: serviceUrl,
          privacy_link: serviceUrl + "privacy-notice"
        },
        reference: `${userId}`
      },
    );
  } catch (error) {
    logger.error(`${ERROR_SENDING_EMAIL_MESSAGE} error: ${error}`);
    throw get(error, 'error.errors[0]') || { message: ERROR_SENDING_EMAIL_MESSAGE };
  }

  logger.info(`Email sent to ${email} with temporary password`);
}

module.exports = {
  sendEmailWithTempPassword
}