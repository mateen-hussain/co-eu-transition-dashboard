FROM mysql:latest

ENV MYSQL_ROOT_PASSWORD password
ENV MYSQL_DATABASE dashboard
ENV MYSQL_USER user
ENV MYSQL_PASSWORD pass

ADD setup.sql /docker-entrypoint-initdb.d