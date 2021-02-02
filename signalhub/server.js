var http = require('http')
var https = require('https')
var corsify = require('corsify')
var collect = require('stream-collector')
var pump = require('pump')
var iterate = require('random-iterate')
var limiter = require('size-limit-stream')
var eos = require('end-of-stream')

var flushHeaders = function (res) {
  if (res.flushHeaders) {
    res.flushHeaders()
  } else {
    if (!res._header) res._implicitHeader()
    res._send('')
  }
}

module.exports = function (opts) {
  var channels = {}
  var maxBroadcasts = (opts && opts.maxBroadcasts) || Infinity
  var subs = 0

  var get = function (channel) {
    if (channels[channel]) return channels[channel]
    var sub = {name: channel, subscribers: [], heartbeat: null}
    sub.heartbeat = setInterval(heartbeater(sub), 30 * 1000)
    channels[channel] = sub
    return channels[channel]
  }

  var cors = corsify({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization'
  })

  var onRequest = cors(function (req, res) {
    if (req.url === '/') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      flushHeaders(res)
      res.end(JSON.stringify({name: 'signalhub', version: require('./package').version, subscribers: subs}, null, 2) + '\n')
      return
    }

    if (req.url.slice(0, 4) !== '/v1/') {
      res.statusCode = 404
      res.end()
      return
    }

    var name = req.url.slice(4).split('?')[0]

    if (req.method === 'POST') {
      collect(pump(req, limiter(64 * 1024)), function (err, data) {
        if (err) return res.end()
        if (!channels[name]) return res.end()
        var channel = get(name)

        server.emit('publish', channel.name, data)
        data = Buffer.concat(data).toString()

        var ite = iterate(channel.subscribers)
        var next
        var cnt = 0

        while ((next = ite()) && cnt++ < maxBroadcasts) {
          next.write('data: ' + data + '\n\n')
        }

        res.end()
      })
      return
    }

    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      // Disable NGINX request buffering
      res.setHeader('X-Accel-Buffering', 'no')

      var app = name.split('/')[0]
      var channelNames = name.slice(app.length + 1)

      channelNames.split(',').forEach(function (channelName) {
        var channel = get(app + '/' + channelName)
        server.emit('subscribe', channel.name)
        channel.subscribers.push(res)
        subs++
        eos(res, function () {
          subs--
          var i = channel.subscribers.indexOf(res)
          if (i > -1) channel.subscribers.splice(i, 1)
          if (!channel.subscribers.length && channel === channels[channel.name]) {
            clearInterval(channel.heartbeat)
            delete channels[channel.name]
          }
        })
      })

      flushHeaders(res)
      return
    }

    res.statusCode = 404
    res.end()
  })

  var useHttps = !!(opts && opts.key && opts.cert)
  var server = useHttps ? https.createServer(opts) : http.createServer()

  server.on('request', onRequest)
  server.on('close', function () {
    var names = Object.keys(channels)
    for (var i = 0; i < names.length; i++) {
      clearInterval(channels[names[i]].heartbeat)
    }
  })

  return server
}

function heartbeater (sub) {
  return function () {
    for (var i = 0; i < sub.subscribers.length; i++) {
      sub.subscribers[i].write(':heartbeat signal\n\n')
    }
  }
}
