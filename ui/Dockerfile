FROM node:alpine AS builder

COPY yarn.lock package.json ./

RUN yarn install && yarn global add esbuild
COPY . .
RUN npx esbuild --bundle ./App.jsx --outfile=./bundle.js --format=esm --target=es6 --define:process.env.NODE_ENV='"development"'

FROM node:alpine

RUN mkdir /app
WORKDIR /app

COPY docker/set-jam-host /usr/local/bin/
COPY css ./css/
COPY img ./img/
COPY server ./server/
COPY --from=builder /bundle.js ./
RUN yarn add express ejs node-fetch

CMD node server/bin/www

EXPOSE 3000
