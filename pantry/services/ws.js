const WebSocket = require('ws');

function addWebsocket(server) {
  const wss = new WebSocket.Server({noServer: true});

  wss.on('connection', socket => {
    socket.on('message', msg => {
      console.log('received msg', msg);
      socket.send(msg);
    });
    socket.send('hello!');
  });

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, socket => {
      wss.emit('connection', socket, request);
    });
  });
}

module.exports = {addWebsocket};
