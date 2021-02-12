FROM node:alpine AS builder

COPY yarn.lock package.json ./

RUN yarn install && yarn global add esbuild
COPY . .
RUN npx esbuild --bundle ./App.jsx --outfile=./bundle.js --format=esm --define:process.env.NODE_ENV='"development"'

FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/set-jam-host /usr/local/bin/
COPY img /usr/share/nginx/html/img
COPY --from=builder /index.html /bundle.js /usr/share/nginx/html/
CMD set-jam-host && nginx -g 'daemon off;'
