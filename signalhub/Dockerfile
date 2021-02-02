FROM node:alpine
RUN mkdir /signalhub
COPY . /signalhub
WORKDIR /signalhub
EXPOSE 80
CMD node ./bin.js listen -p 80 -q

