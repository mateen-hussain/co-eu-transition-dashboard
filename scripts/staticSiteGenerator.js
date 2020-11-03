/*
 * Export static site
 * Usage: node staticSiteGenerator --url [url] --dir [directory_export_path] --email [user_email] --password [user_password]
 */

const scrape = require('website-scraper');
const path = require('path');
const fs = require('fs');
const get = require('lodash/get');
const request = require('request-promise-native');
const config = require('config');
const logger = require('../services/logger');
const commandLineArgs = require('command-line-args');
const { SaveResourceToFileSystemPlugin } = require('website-scraper/lib/plugins');

// A plugin to add logging to export process
class Reporting {
  apply(registerAction) {
    registerAction('beforeStart', () => logger.info(`Export started`));
    registerAction('afterFinish', () => logger.info(`Export complete`));
    registerAction('error', async ({ error }) => logger.error(error));
    registerAction('onResourceSaved', async ({ resource }) => logger.info(`Exported ${resource.url}`));
  }
};

/* A plugin to allow strings to be replaced ( can be used to change external urls )
 * usage:
 *   const stringsReplaceMap = {
 *     'https://some-old-url.com/': 'https://some-new-url.com/'
 *   };
 *   new StringReplace(stringsReplaceMap)
 */
class StringReplace {
  constructor(stringsReplaceMap) {
    this.stringsReplaceMap = stringsReplaceMap;
  }

  apply(registerAction) {
      registerAction('saveResource', async ({ resource }) => {
        if(!resource.isHtml()) {
          return;
        }

        let text = resource.getText();

        for (const [originalString, newString] of Object.entries(this.stringsReplaceMap)) {
          const regx = new RegExp(originalString,"g");
          text = text.replace(regx, newString);
        }

        resource.setText(text);
      });
    }
};

// argument options script arguments
const optionDefinitions = [
  { name: 'url', alias: 'u', type: String },
  { name: 'login-url', alias: 'l', type: String },
  { name: 'dir', alias: 'd', type: String },
  { name: 'email', alias: 'e', type: String },
  { name: 'password', alias: 'p', type: String  }
];
const options = commandLineArgs(optionDefinitions);
options.dir = path.resolve(options.dir) || path.resolve(__dirname, '..', 'dist');
options.email = options.email || config.credentials.staticExportUser.email;
options.password = options.password || config.credentials.staticExportUser.password;
options.loginUrl = options.loginUrl || `${options.url}/login`;

// Logs into a given url with params email and password and returns the cookies set by server
const getAuthedCookie = async (url) => {
  logger.info(`Logging into ${options.url}`);
  const response = await request.post({
    url,
    form: {
      email: options.email,
      password: options.password
    },
    simple: false,
    resolveWithFullResponse: true
  });

  return get(response, 'headers["set-cookie"]');
};

const removeTemporaryDirectory = dir => {
  logger.info(`Creating temprary directory ${options.dir}`);
  return new Promise((resolve, reject) => {
    fs.rmdir(dir, { recursive: true }, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};

const exportStaticSite = async () => {
  await removeTemporaryDirectory(options.dir);
  const cookie = await getAuthedCookie(options.loginUrl);

  // no strings to replace yet
  const stringsReplaceMap = {};

  await scrape({
    urls: [ options.url ],
    directory: options.dir,
    recursive: true,
    maxDepth: 50,
    urlFilter: url => url.includes(options.url),
    request: {
      headers: {
        Cookie: cookie
      }
    },
    plugins: [
      new Reporting(options.url),
      new StringReplace(stringsReplaceMap),
      new SaveResourceToFileSystemPlugin()
    ]
  });
}

exportStaticSite();
