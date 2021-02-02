# signalhub

Simple signalling server that can be used to coordinate handshaking with webrtc or other fun stuff.

```
npm install signalhub
```

Or to install the command line tool

```
npm install -g signalhub
```

[![build status](http://img.shields.io/travis/mafintosh/signalhub.svg?style=flat)](http://travis-ci.org/mafintosh/signalhub)

## Usage

``` js
var signalhub = require('signalhub')
var hub = signalhub('my-app-name', [
  'http://yourhub.com'
])

hub.subscribe('my-channel')
  .on('data', function (message) {
    console.log('new message received', message)
  })

hub.broadcast('my-channel', {hello: 'world'})
```

## API

#### `hub = signalhub(appName, urls)`

Create a new hub client. If you have more than one hub running specify them in an array

``` js
// use more than one server for redundancy
var hub = signalhub('my-app-name', [
  'https://signalhub1.example.com',
  'https://signalhub2.example.com',
  'https://signalhub3.example.com'
])
```

The `appName` is used to namespace the subscriptions/broadcast so you can reuse the
signalhub for more than one app.

#### `stream = hub.subscribe(channel)`

Subscribe to a channel on the hub. Returns a readable stream of messages

#### `hub.broadcast(channel, message, [callback])`

Broadcast a new message to a channel on the hub

#### `hub.close([callback])`

Close all subscriptions

## CLI API

You can use the command line api to run a hub server

```
signalhub listen -p 8080 # starts a signalhub server on 8080
```

To listen on https, use the `--key` and `--cert` flags to specify the path to the private
key and certificate files, respectively. These will be passed through to the node `https`
package.

To avoid logging to console on every subscribe/broadcast event use the `--quiet` or `-q` flag.

Or broadcast/subscribe to channels

```
signalhub broadcast my-app my-channel '{"hello":"world"}' -p 8080 -h yourhub.com
signalhub subscribe my-app my-channel -p 8080 -h yourhub.com
```

## Browserify

This also works in the browser using browserify :)

## Publicly available signalhubs

Through the magic of free hosting, here are some free open signalhub servers!
For serious applications though, consider deploying your own instances.

- https://signalhub-jccqtwhdwc.now.sh
- https://signalhub-hzbibrznqa.now.sh

## Deploying with popular services

No additional configuration is needed.

### now.sh

```
now mafintosh/signalhub
```

### Heroku
[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## License

MIT
