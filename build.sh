#!/bin/bash

if [ -z "$NODE_ENV" ] || [ "$NODE_ENV" == "development" ]
then
  echo "Skipping build due to development environment"
  exit
fi

rm -rf dist && npx webpack --config webpack.config.js

