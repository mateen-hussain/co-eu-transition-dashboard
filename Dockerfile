FROM node:12

ARG NODE_ENV=development
ENV NODE_ENV $NODE_ENV

WORKDIR /home/node/app

COPY . /usr/src/app