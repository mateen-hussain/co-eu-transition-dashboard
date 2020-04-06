#!/bin/bash

CURRENT_SPACE=`cf target|grep space|sed -E 's/^space: +([^ ]*)/\1/g'`
REQUESTED_SPACE=$1
VARS_FILE=$2

if [ -z "$REQUESTED_SPACE" ] || [ -z "$VARS_FILE" ]
then
  echo "Usage $0 <target space> <manifest vars file>"
  exit 1
fi

git checkout $REQUESTED_SPACE
git pull origin $REQUESTED_SPACE

if [[ `git status --porcelain` ]]; then
  echo "Git state not clean, please fix before deploying"
  exit 1
fi

if [[ `git log origin/$REQUESTED_SPACE..$REQUESTED_SPACE` ]]; then
  echo "Branch has unpushed changes, please fix before deploying"
  exit 1
fi

cf target -s $REQUESTED_SPACE && cf push --vars-file $VARS_FILE
RETURN=$?
cf target -s $CURRENT_SPACE

if [ $RETURN -ne 0 ]
then
  echo "Could not push code out check messages above"
  exit 1
fi


