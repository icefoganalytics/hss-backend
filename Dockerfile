# Node 20 LTS on Debian Bookworm (glibc 2.36).
# Replaces the EOL Oracle Linux 7 base + Node 16 (OL7's glibc 2.17 cannot run
# Node 18+). See audit MED-02. NOTE: this build must be validated in CI.
FROM --platform=linux/amd64 node:20-bookworm-slim

ENV ORACLE_DIR=/opt/oracle

# Oracle Instant Client (basiclite) for the oracledb driver — fetched at build
# time rather than committed to the repo (see audit HIGH-07).
RUN apt-get update && apt-get install -y --no-install-recommends \
        libaio1 wget unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p ${ORACLE_DIR} \
    && cd ${ORACLE_DIR} \
    && wget -q https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip \
    && unzip -q instantclient-basiclite-linuxx64.zip \
    && rm -f instantclient-basiclite-linuxx64.zip \
    && cd ${ORACLE_DIR}/instantclient* \
    && rm -f *jdbc* *occi* *mysql* *mql1* *ipc1* *jar uidrvci genezi adrci \
    && echo /opt/oracle/instantclient* > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig

RUN mkdir -p /home/node/app /home/node/web

# Install dependencies first for better layer caching.
COPY src/api/package*.json /home/node/app/
COPY src/web/package*.json /home/node/web/

WORKDIR /home/node/app
RUN npm install && npm cache clean --force --loglevel=error
# Secrets are injected at runtime (see audit CRIT-07) — never copy .env into the image.

WORKDIR /home/node/web
RUN npm install && npm cache clean --force --loglevel=error

# Copy source and build both apps.
COPY src/api /home/node/app/
COPY src/web /home/node/web/

RUN npm run build:docker

WORKDIR /home/node/app
ENV NODE_ENV=production
RUN npm run build:api

# Drop privileges: run as the unprivileged 'node' user that ships with the base
# image (see audit HIGH-06).
RUN chown -R node:node /home/node
USER node

EXPOSE 3000

CMD [ "node", "./dist/index.js" ]
