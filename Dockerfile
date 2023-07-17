FROM node:19

WORKDIR /app

COPY LICENSE ./

COPY tsconfig.json ./

COPY tsconfig.build.json ./

COPY package.json ./

COPY package-lock.json ./

RUN npm ci

COPY README.md ./

RUN git clone https://github.com/p0t4t0sandwich/minecraft-be-websocket-api.git

COPY ./plugins ./plugins

COPY index.ts ./

RUN /app/node_modules/typescript/bin/tsc -p /app/tsconfig.build.json

CMD ["node", "./dist/index.js"]