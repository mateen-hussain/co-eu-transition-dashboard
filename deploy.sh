#!/bin/bash

CURRENT_SPACE=`cf target|grep space|sed 's/^space: \+\(.*$\)/\1/'`
REQUESTED_SPACE=$1
VARS_FILE=$2

if [ -z "$REQUESTED_SPACE" ] || [ -z "$REQUESTED_HOST" ]
then
  echo "Usage $0 <target space> <target host>"
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


