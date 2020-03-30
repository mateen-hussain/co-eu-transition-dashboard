# Dashboard

## Development Setup

### Run Database
1. Startup docker in background
2. Open new console
3. run `make database`

### Run node server
1. Open new console
2. run `npm install`
3. run `npm run dev`

## Authentication

There are two mock users setup for local development:
1. Admin
username: admin@email.com
password: password

2. User
username: user@email.com
password: password

## Deployment

### Staging
1. Check out the branch you wish to test on staging
2. Make sure you have access to the relevant org/space on the gov.uk PaaS (https://www.cloud.service.gov.uk/)
3. run `npm run deploy-staging`
4. Test your changes

### Research
1. Check out the branch you wish to test on the user research environment
2. Make sure you have access to the relevant org/space on the gov.uk PaaS (https://www.cloud.service.gov.uk/)
3. run `npm run deploy-research`
4. Test your changes

### Production
:warning: **These instructions will currently bring down the live service for a minute or two**
1. Checkout master and make sure it's up to date
2. Make sure you have access to the relevant org/space on the gov.uk PaaS (https://www.cloud.service.gov.uk/)
3. run `npm run release -- minor` (If you want to do a major or patch replace as appropriate)
4. When that completes run `git checkout <version number>` where the version is the one release tag which was just created`
5. run `npm run deploy-production`
6. Test your release on production


