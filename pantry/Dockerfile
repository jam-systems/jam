FROM node:alpine
ENV JAM_CONFIG_DIR=/jam-config
RUN mkdir /pantry
WORKDIR /pantry
COPY yarn.lock package.json /pantry/
# TODO: maybe ignore optional dependencies (=mediasoup) when JAM_SFU flag is not set
# yarn --ignore-optional
RUN yarn
COPY . /pantry
EXPOSE 3001
CMD node ./bin/www

