FROM node:alpine AS builder

COPY yarn.lock package.json ./

RUN yarn install && yarn global add esbuild
COPY . .
RUN npx esbuild --bundle ./App.jsx --outfile=./bundle.js --format=esm --define:process.env.NODE_ENV='"development"'

FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /index.html /bundle.js /img /usr/share/nginx/html/
