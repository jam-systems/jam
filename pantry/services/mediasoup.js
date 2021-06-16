const os = require('os');
const {local} = require('../config');
const {
  sendRequest,
  onMessage,
  onRemovePeer,
  onAddPeer,
  sendDirect,
} = require('./ws');

const hasMediasoup = ['true', '1'].includes(process.env.JAM_SFU);
const announcedIp =
  process.env.JAM_SFU_EXTERNAL_IP || (local ? localIp() : null);

const workers = [];
const rooms = new Map();
let workerIndex = 0;

module.exports = {runMediasoup};

// rooms = Map(roomId => room)
// room = {id: roomId, router, peers: Map(peerId => peer)};
// peer = {id: peerId, doesConsume, rtpCapabilities, transports, producers, consumers, doesConsume, consumerTransport}

function runMediasoup() {
  if (!hasMediasoup) return;

  if (!announcedIp) {
    throw Error(
      `Missing environment variable JAM_SFU_EXTERNAL_IP. Provide your external IP to use mediasoup.
If you do not wish to use mediasoup, make sure the JAM_SFU environment variable is not set.`
    );
  }

  try {
    const mediasoup = require('mediasoup');
    runMediasoupWorkers(mediasoup);
  } catch (err) {
    throw Error(
      `Could not import mediasoup. Probably, optional npm dependencies were not installed.
If you do not wish to use mediasoup, make sure the JAM_SFU environment variable is not set.`
    );
  }

  onAddPeer(async (roomId, peerId) => {
    let room = await getOrCreateRoom(roomId);
    let rtpCapabilities = room.router.rtpCapabilities;
    sendDirect(roomId, peerId, 'mediasoup-info', {rtpCapabilities});
  });

  onMessage('mediasoup', async (roomId, peerId, {type, data}, accept) => {
    const room = await getOrCreateRoom(roomId);
    const router = room.router;
    const peer = await getOrCreatePeer(room, peerId);
    console.log('mediasoup request', type, roomId, peerId);

    switch (type) {
      case 'createWebRtcTransport': {
        let {forceTcp, producing, consuming, rtpCapabilities} = data;
        peer.rtpCapabilities = rtpCapabilities;

        let transportOptions = {
          ...config.mediasoup.webRtcTransportOptions,
          appData: {producing, consuming},
        };
        if (forceTcp) {
          transportOptions.enableUdp = false;
          transportOptions.enableTcp = true;
        }

        const transport = await router.createWebRtcTransport(transportOptions);
        if (consuming) {
          peer.doesConsume = true;
          peer.consumerTransport = transport;
        }

        let printTransports = () => {
          console.log(
            'transports',
            roomId,
            peerId.slice(0, 4),
            'consuming',
            [...peer.transports.values()].filter(t => t.appData.consuming)
              .length,
            'producing',
            [...peer.transports.values()].filter(t => t.appData.producing)
              .length
          );
        };

        peer.transports.set(transport.id, transport);
        printTransports();

        transport.on('dtlsstatechange', dtlsState => {
          if (dtlsState === 'failed' || dtlsState === 'closed') {
            // peer disconnected; called transport.close() or closed browser tab
            console.warn(
              'WebRtcTransport "dtlsstatechange" event, dtlsState',
              dtlsState
            );
            transport.close();
          }
        });

        transport.observer.on('close', () => {
          console.log(
            'transport closed!',
            consuming ? '(consuming)' : '(producing)'
          );
          peer.transports.delete(transport.id);
          printTransports();
        });

        accept({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });

        const {maxIncomingBitrate} = config.mediasoup.webRtcTransportOptions;
        if (maxIncomingBitrate) {
          try {
            await transport.setMaxIncomingBitrate(maxIncomingBitrate);
          } catch (error) {}
        }

        if (consuming) {
          // send this peer the existing tracks from other peers
          // => create Consumers for existing Producers
          for (const otherPeer of yieldOtherPeers(room, peerId)) {
            for (const producer of otherPeer.producers.values()) {
              createConsumer(room, {
                consumerPeer: peer,
                producerPeer: otherPeer,
                producer,
              });
            }
          }
        }
        break;
      }

      case 'connectWebRtcTransport': {
        const {transportId, dtlsParameters} = data;
        const transport = peer.transports.get(transportId);
        if (transport === undefined) {
          console.error('transport not found', transportId);
          return;
        }
        await transport.connect({dtlsParameters});
        accept();
        break;
      }

      // case 'restartIce': {
      //   const {transportId} = data;
      //   const transport = peer.transports.get(transportId);
      //   if (!transport)
      //     throw new Error(`transport with id "${transportId}" not found`);
      //   const iceParameters = await transport.restartIce();
      //   accept(iceParameters);
      //   break;
      // }

      case 'produce': {
        let {transportId, kind, rtpParameters, appData} = data;
        const transport = peer.transports.get(transportId);

        if (transport === undefined) {
          console.error('transport not found', transportId);
          return;
        }

        const producer = await transport.produce({
          kind,
          rtpParameters,
          appData,
        });
        peer.producers.set(producer.id, producer);

        producer.on('score', score => {
          console.log('producerScore', peerId, score);
        });

        accept({id: producer.id});

        // send this new track to all other peers
        // => create Consumer on each peer except this one
        for (const otherPeer of yieldOtherPeers(room, peerId)) {
          createConsumer(room, {
            consumerPeer: otherPeer,
            producerPeer: peer,
            producer,
          });
        }
        break;
      }

      case 'closeProducer': {
        const {producerId} = data;
        const producer = peer.producers.get(producerId);
        if (producer === undefined) {
          console.error('producer not found', producerId);
          return;
        }

        producer.close();
        peer.producers.delete(producer.id);

        accept();
        break;
      }
    }
  });

  onRemovePeer((roomId, peerId) => {
    const room = rooms.get(roomId);
    if (room === undefined) return;
    const peer = room.peers.get(peerId);
    if (peer === undefined) return;
    for (const transport of peer.transports.values()) {
      transport.close();
    }
    room.peers.delete(peerId);
    if (room.peers.size === 0) {
      closeRoom(room);
    }
  });
}

async function createConsumer(room, {consumerPeer, producerPeer, producer}) {
  // don't create the Consumer if the remote Peer cannot consume it
  if (
    !consumerPeer.doesConsume ||
    !consumerPeer.rtpCapabilities ||
    !room.router.canConsume({
      producerId: producer.id,
      rtpCapabilities: consumerPeer.rtpCapabilities,
    })
  ) {
    return;
  }

  // check if consumerPeer already has the same producer
  for (let otherProducer of consumerPeer.consumers.values()) {
    if (producer === otherProducer) return;
  }

  const transport = consumerPeer.consumerTransport;
  let consumer;
  try {
    consumer = await transport.consume({
      producerId: producer.id,
      rtpCapabilities: consumerPeer.rtpCapabilities,
      paused: false,
    });
  } catch (error) {
    console.warn('createConsumer() | transport.consume()', error);
    return;
  }

  consumerPeer.consumers.set(consumer.id, consumer);

  consumer.on('transportclose', () => {
    consumerPeer.consumers.delete(consumer.id);
  });

  consumer.on('producerclose', () => {
    consumerPeer.consumers.delete(consumer.id);
    // consumerPeer
    //   .notify('consumerClosed', {consumerId: consumer.id})
    //   .catch(() => {});
  });

  // Send a request to the remote Peer with Consumer parameters.
  try {
    await sendRequest(room.id, consumerPeer.id, 'new-consumer', {
      peerId: producerPeer.id,
      producerId: producer.id,
      id: consumer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      type: consumer.type,
      appData: producer.appData,
      producerPaused: consumer.producerPaused,
    });
  } catch (error) {
    console.warn('createConsumer() | failed', error);
  }
}

async function getOrCreatePeer(room, peerId) {
  let peer = room.peers.get(peerId);
  if (peer === undefined) {
    peer = {
      id: peerId,
      doesConsume: false,
      rtpCapabilities: undefined,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
      consumerTransport: null,
    };
    room.peers.set(peerId, peer);
  }
  return peer;
}

function* yieldOtherPeers(room, excludePeerId) {
  for (let peer of room.peers.values()) {
    if (peer.id !== excludePeerId) yield peer;
  }
}

async function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);
  if (room === undefined) {
    console.log('creating a new Room', roomId);
    const mediasoupWorker = getMediasoupWorker();
    const {mediaCodecs} = config.mediasoup.routerOptions;
    const router = await mediasoupWorker.createRouter({mediaCodecs});
    room = {id: roomId, router, peers: new Map()};
    rooms.set(roomId, room);
  }
  return room;
}

function closeRoom(room) {
  room.router.close();
  rooms.delete(room.id);
}

function getMediasoupWorker() {
  const worker = workers[workerIndex];
  workerIndex = (workerIndex + 1) % workers.length;
  return worker;
}

async function runMediasoupWorkers(mediasoup) {
  const {numWorkers} = config.mediasoup;
  console.log(`running ${numWorkers} mediasoup Workers...`);

  for (let i = 0; i < numWorkers; ++i) {
    const worker = await mediasoup.createWorker({
      ...config.mediasoup.workerSettings,
    });
    worker.on('died', () => {
      console.error('mediasoup Worker died, exiting', worker.pid);
      setTimeout(() => process.exit(1), 2000);
    });
    workers.push(worker);

    // Log worker resource usage every X seconds.
    // setInterval(async () => {
    //   const usage = await worker.getResourceUsage();
    //   console.log('mediasoup Worker resource usage', worker.pid, usage);
    // }, 120000);
  }
}

const config = {
  // mediasoup settings.
  mediasoup: {
    // Number of mediasoup workers to launch.
    numWorkers: Object.keys(os.cpus()).length,
    // mediasoup WorkerSettings.
    // See https://mediasoup.org/documentation/v3/mediasoup/api/#WorkerSettings
    workerSettings: {
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtx', 'score', 'svc'],
      rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT || 40000),
      rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT || 49999),
    },
    // mediasoup Router options.
    // See https://mediasoup.org/documentation/v3/mediasoup/api/#RouterOptions
    routerOptions: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
      ],
    },
    // mediasoup WebRtcTransport options for WebRTC endpoints (mediasoup-client,
    // libmediasoupclient).
    // See https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
    webRtcTransportOptions: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp,
        },
      ],
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxSctpMessageSize: 262144,
      // Additional options that are not part of WebRtcTransportOptions.
      // maxIncomingBitrate: 1500000,
    },
  },
};

function localIp() {
  let interfaces = [].concat(...Object.values(os.networkInterfaces()));
  let ip = interfaces.find(x => !x.internal && x.family === 'IPv4')?.address;
  if (hasMediasoup) console.log('mediasoup: falling back to announced IP', ip);
  return ip;
}
