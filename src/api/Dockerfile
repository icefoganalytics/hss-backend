# Development image: Node 20 LTS on Debian Bookworm.
# Replaces the EOL Oracle Linux 7 base + Node 13 (see audit MED-02).
# NOTE: this build must be validated in CI.
FROM node:20-bookworm-slim

ENV TZ="America/Whitehorse"
ENV ORACLE_DIR=/opt/oracle

RUN apt-get update && apt-get install -y --no-install-recommends \
        libaio1 wget unzip ca-certificates iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Oracle Instant Client (basiclite) for the oracledb driver.
RUN mkdir -p ${ORACLE_DIR} \
    && cd ${ORACLE_DIR} \
    && wget -q https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip \
    && unzip -q instantclient-basiclite-linuxx64.zip \
    && rm -f instantclient-basiclite-linuxx64.zip \
    && echo /opt/oracle/instantclient* > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig

WORKDIR /usr/src/app
COPY package.json /usr/src/app/package.json
RUN npm install

COPY ./ ./

# Run as the unprivileged 'node' user that ships with the base image.
USER node
EXPOSE 3000

CMD ["npm", "run", "start:dev"]
