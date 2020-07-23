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

## Release/Deployment Workflow

Releases to the various environments all happen automatically via [Concourse](https://cd.gds-reliability.engineering/teams/cabinet-office-transition/pipelines/co-eu-transition-dashboard).  There are branches for each environment (staging/production) and merges to these branches will automatically trigger a deployment.  The deployments use a rolling strategy to ensure no downtime to the service.

Before merging to these branches you should ensure that the build is passing on [Travis](https://travis-ci.org/github/alphagov/co-eu-transition-dashboard/) [![Build Status](https://travis-ci.org/alphagov/co-eu-transition-dashboard.svg?branch=master)](https://travis-ci.org/alphagov/co-eu-transition-dashboard).

### Staging
1. Make sure your repository is up to date `git fetch --all`
2. Check out the staging branch `git checkout staging`
3. Update the staging branch `git pull origin staging`
4. Merge master to staging `git merge origin/master`
5. Commit any changes `git commit -a`
6. Push the new staging branch to remote `git push origin staging`
7. Test your changes

### Production
1. Make sure your repository is up to date `git fetch --all`
2. Check out the production branch `git checkout production`
3. Update the production branch `git pull origin production`
4. Merge staging to production `git merge origin/staging`
5. Commit any changes `git commit -a`
6. Push the new production branch to remote `git push origin production`
7. Test your changes
