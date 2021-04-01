FROM node:alpine AS builder

COPY yarn.lock package.json ./

RUN yarn install && yarn global add esbuild
COPY . .
RUN yarn build

FROM node:alpine

ENV JAM_CONFIG_DIR=/jam-config

RUN mkdir /app
WORKDIR /app

COPY public ./public/
COPY server ./server/
COPY --from=builder /public/bundle.js ./public
RUN yarn add express ejs node-fetch

CMD node server/bin/www

EXPOSE 3000
