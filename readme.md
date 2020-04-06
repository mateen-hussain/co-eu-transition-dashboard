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

## Deployment Workflow

### Staging
1. Make sure your repository is up to date ```git fetch --all```
2. Check out the staging branch ```git checkout staging```
3. Update the staging branch ```git pull origin staging```
4. Merge master to staging ```git merge origin/master```
5. Commit any changes ```git commit -a```
6. Push the new staging branch to master ``git push origin staging```
7. Make sure you have access to the relevant org/space on the gov.uk PaaS (https://www.cloud.service.gov.uk/)
8. Deploy ```npm run dpeloy-staging```
9. Test your changes

### Research
1. Make sure your repository is up to date ```git fetch --all```
2. Check out the research branch ```git checkout research```
3. Update the research branch ```git pull origin research```
4. Merge master to research ```git merge origin/master```
5. Commit any changes ```git commit -a```
6. Push the new research branch to master ``git push origin research```
7. Make sure you have access to the relevant org/space on the gov.uk PaaS (https://www.cloud.service.gov.uk/)
8. Deploy ```npm run dpeloy-research```
9. Test your changes

### Production
:warning: **These instructions will currently bring down the live service for a minute or two**
1. Make sure your repository is up to date ```git fetch --all```
2. Check out the production branch ```git checkout production```
3. Update the production branch ```git pull origin production```
4. Merge staging to production ```git merge origin/staging```
5. Commit any changes ```git commit -a```
6. Push the new production branch to master ``git push origin production```
7. Make sure you have access to the relevant org/space on the gov.uk PaaS (https://www.cloud.service.gov.uk/)
8. Deploy ```npm run dpeloy-production```
9. Test your changes
