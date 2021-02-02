FROM node:alpine
RUN mkdir /signalhub
COPY yarn.lock package.json /signalhub/
RUN yarn
COPY . /signalhub
WORKDIR /signalhub
EXPOSE 80
CMD node ./bin.js listen -p 80 -q

