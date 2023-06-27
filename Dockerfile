FROM node:19

WORKDIR /app

COPY LICENSE ./

COPY tsconfig.json ./

COPY tsconfig.build.json ./

COPY package.json ./

COPY package-lock.json ./

RUN npm ci

COPY README.md ./

COPY ./minecraft-be-websocket-api ./minecraft-be-websocket-api

COPY ./plugins ./plugins

COPY index.ts ./

RUN /app/node_modules/typescript/bin/tsc -p /app/tsconfig.build.json

CMD ["node", "./dist/index.js"]