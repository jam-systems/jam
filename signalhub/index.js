var events = require('events')
var ess = require('event-source-stream')
var nets = require('nets')
var pump = require('pump')
var through = require('through2')
var inherits = require('inherits')

module.exports = SignalHub

function SignalHub (app, urls) {
  if (!(this instanceof SignalHub)) return new SignalHub(app, urls)
  if (!app) throw new Error('app name required')
  if (!urls || !urls.length) throw new Error('signalhub url(s) required')

  events.EventEmitter.call(this)
  this.setMaxListeners(0)

  this.app = app
  if (!Array.isArray(urls)) urls = [urls]
  this.urls = urls.map(function (url) {
    url = url.replace(/\/$/, '')
    return url.indexOf('://') === -1 ? 'http://' + url : url
  })
  this.subscribers = []
  this.closed = false
}

inherits(SignalHub, events.EventEmitter)

SignalHub.prototype.subscribe = function (channel) {
  if (this.closed) throw new Error('Cannot subscribe after close')

  var self = this
  var endpoint = Array.isArray(channel) ? channel.join(',') : channel
  var streams = this.urls.map(function (url) {
    return ess(url + '/v1/' + self.app + '/' + endpoint, {json: true})
  })

  var subscriber
  if (streams.length === 1) {
    subscriber = streams[0]
  } else {
    subscriber = through.obj()
    subscriber.setMaxListeners(0)
    streams.forEach(function (stream) {
      stream.on('open', function () {
        subscriber.emit('open')
      })
      pump(stream, subscriber)
    })
  }

  this.subscribers.push(subscriber)

  subscriber.once('close', function () {
    var i = self.subscribers.indexOf(subscriber)
    if (i > -1) self.subscribers.splice(i, 1)
  })

  return subscriber
}

SignalHub.prototype.broadcast = function (channel, message, cb) {
  if (this.closed) throw new Error('Cannot broadcast after close')
  if (!message) message = {}
  if (!cb) cb = noop

  var pending = this.urls.length
  var errors = 0

  var self = this
  this.urls.forEach(function (url) {
    broadcast(self.app, url, channel, message, function (err) {
      if (err) errors++
      if (--pending) return
      if (errors === self.urls.length) return cb(err)
      cb()
    })
  })
}

SignalHub.prototype.close = function (cb) {
  if (this.closed) return
  this.closed = true

  if (cb) this.once('close', cb)
  var len = this.subscribers.length
  if (len > 0) {
    var self = this
    var closed = 0
    this.subscribers.forEach(function (subscriber) {
      subscriber.once('close', function () {
        if (++closed === len) {
          self.emit('close')
        }
      })
      process.nextTick(function () {
        subscriber.destroy()
      })
    })
  } else {
    this.emit('close')
  }
}

function broadcast (app, url, channel, message, cb) {
  return nets({
    method: 'POST',
    json: message,
    url: url + '/v1/' + app + '/' + channel
  }, function (err, res) {
    if (err) return cb(err)
    if (res.statusCode !== 200) return cb(new Error('Bad status: ' + res.statusCode))
    cb()
  })
}

function noop () {}
