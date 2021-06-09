const mediasoup = require('mediasoup');
const os = require('os');
const {sendRequestToPeer, onMessage, onRemovePeer} = require('./ws');

const workers = [];
const rooms = new Map();
let workerIndex = 0;

module.exports = {runMediasoupWorkers};

// rooms = Map(roomId => room)
// room = {id: roomId, router, peers: Map(peerId => peer)};
// peer = {id: peerId, doesConsume, hasJoined, rtpCapabilities, transports, producers, consumers}

onMessage('mediasoup', async (roomId, peerId, {type, data}, accept) => {
  const room = await getOrCreateRoom(roomId);
  const router = room.router;
  const peer = await getOrCreatePeer(room, peerId);

  switch (type) {
    case 'getRouterRtpCapabilities': {
      accept(router.rtpCapabilities);
      break;
    }

    case 'join': {
      const {rtpCapabilities} = data;

      if (peer.hasJoined) throw new Error('Peer already joined');
      peer.hasJoined = true;
      peer.rtpCapabilities = rtpCapabilities;

      // send this peer the existing tracks from other peers
      // => create Consumers for existing Producers
      for (const otherPeer of yieldJoinedPeers(room, peerId)) {
        for (const producer of otherPeer.producers.values()) {
          createConsumer(room, {
            consumerPeer: peer,
            producerPeer: otherPeer,
            producer,
          });
        }
      }

      accept();
      break;
    }

    case 'createWebRtcTransport': {
      // NOTE: Don't require that the Peer is joined here, so the client can
      // initiate mediasoup Transports and be ready when he later joins.
      let {forceTcp, producing, consuming} = data;

      let transportOptions = {
        ...config.mediasoup.webRtcTransportOptions,
        appData: {producing, consuming},
      };
      if (forceTcp) {
        transportOptions.enableUdp = false;
        transportOptions.enableTcp = true;
      }

      const transport = await router.createWebRtcTransport(transportOptions);

      transport.on('dtlsstatechange', dtlsState => {
        if (dtlsState === 'failed' || dtlsState === 'closed')
          console.warn(
            'WebRtcTransport "dtlsstatechange" event, dtlsState',
            dtlsState
          );
      });

      peer.transports.set(transport.id, transport);

      accept({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
      // const {maxIncomingBitrate} = config.mediasoup.webRtcTransportOptions;
      // if (maxIncomingBitrate) {
      //   try {
      //     await transport.setMaxIncomingBitrate(maxIncomingBitrate);
      //   } catch (error) {}
      // }
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

      if (!peer.hasJoined) throw new Error('Peer not yet joined');
      if (transport === undefined) {
        console.error('transport not found', transportId);
        return;
      }

      const producer = await transport.produce({kind, rtpParameters, appData});
      peer.producers.set(producer.id, producer);

      producer.on('score', score => {
        console.log('producerScore', peerId, score);
      });

      accept({id: producer.id});

      // send this new track to all other peers
      // => create Consumer on each peer except this one
      for (const otherPeer of yieldJoinedPeers(room, peerId)) {
        createConsumer(room, {
          consumerPeer: otherPeer,
          producerPeer: peer,
          producer,
        });
      }
      break;
    }

    case 'closeProducer': {
      // Ensure the Peer is joined.
      if (!peer.hasJoined) throw new Error('Peer not yet joined');

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

async function createConsumer(room, {consumerPeer, producerPeer, producer}) {
  // Optimization:
  // - Create the server-side Consumer in paused mode.
  // - Tell its Peer about it and wait for its response.
  // - Upon receipt of the response, resume the server-side Consumer.
  // - If video, this will mean a single key frame requested by the
  //   server-side Consumer (when resuming it).
  // - If audio (or video), it will avoid that RTP packets are received by the
  //   remote endpoint *before* the Consumer is locally created in the endpoint
  //   (and before the local SDP O/A procedure ends). If that happens (RTP
  //   packets are received before the SDP O/A is done) the PeerConnection may
  //   fail to associate the RTP stream.

  // NOTE: Don't create the Consumer if the remote Peer cannot consume it.
  if (
    !consumerPeer.rtpCapabilities ||
    !room.router.canConsume({
      producerId: producer.id,
      rtpCapabilities: consumerPeer.rtpCapabilities,
    })
  ) {
    return;
  }

  // Must take the Transport the remote Peer is using for consuming.
  const transport = Array.from(consumerPeer.transports.values()).find(
    t => t.appData.consuming
  );

  // This should not happen.
  if (!transport) {
    console.warn('createConsumer() | Transport for consuming not found');
    return;
  }

  // Create the Consumer in paused mode.
  let consumer;
  try {
    consumer = await transport.consume({
      producerId: producer.id,
      rtpCapabilities: consumerPeer.rtpCapabilities,
      paused: true,
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

  consumer.on('producerpause', () => {
    // consumerPeer
    //   .notify('consumerPaused', {consumerId: consumer.id})
    //   .catch(() => {});
  });

  consumer.on('producerresume', () => {
    // consumerPeer
    //   .notify('consumerResumed', {consumerId: consumer.id})
    //   .catch(() => {});
  });

  consumer.on('score', score => {
    // consumerPeer
    //   .notify('consumerScore', {consumerId: consumer.id, score})
    //   .catch(() => {});
  });

  consumer.on('layerschange', layers => {
    // consumerPeer
    //   .notify('consumerLayersChanged', {
    //     consumerId: consumer.id,
    //     spatialLayer: layers ? layers.spatialLayer : null,
    //     temporalLayer: layers ? layers.temporalLayer : null,
    //   })
    //   .catch(() => {});
  });

  // Send a request to the remote Peer with Consumer parameters.
  try {
    await sendRequestToPeer(room.id, consumerPeer.id, 'new-consumer', {
      peerId: producerPeer.id,
      producerId: producer.id,
      id: consumer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      type: consumer.type,
      appData: producer.appData,
      producerPaused: consumer.producerPaused,
    });

    // Now that we got the positive response from the remote endpoint, resume
    // the Consumer so the remote endpoint will receive the a first RTP packet
    // of this new stream once its PeerConnection is already ready to process
    // and associate it.
    await consumer.resume();

    // consumerPeer
    //   .notify('consumerScore', {
    //     consumerId: consumer.id,
    //     score: consumer.score,
    //   })
    //   .catch(() => {});
  } catch (error) {
    console.warn('createConsumer() | failed', error);
  }
}

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

async function getOrCreatePeer(room, peerId) {
  let peer = room.peers.get(peerId);
  if (peer === undefined) {
    peer = {
      id: peerId,
      doesConsume: false,
      hasJoined: false,
      rtpCapabilities: undefined,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    };
    room.peers.set(peerId, peer);
  }
  return peer;
}

function* yieldJoinedPeers(room, excludePeerId) {
  for (let peer of room.peers.values()) {
    if (peer.hasJoined && peer.id !== excludePeerId) yield peer;
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

async function runMediasoupWorkers() {
  const {numWorkers} = config.mediasoup;

  console.log(`running ${numWorkers} mediasoup Workers...`);

  for (let i = 0; i < numWorkers; ++i) {
    const worker = await mediasoup.createWorker({
      logLevel: config.mediasoup.workerSettings.logLevel,
      logTags: config.mediasoup.workerSettings.logTags,
      rtcMinPort: Number(config.mediasoup.workerSettings.rtcMinPort),
      rtcMaxPort: Number(config.mediasoup.workerSettings.rtcMaxPort),
    });

    worker.on('died', () => {
      console.error(
        'mediasoup Worker died, exiting in 2 seconds... pid',
        worker.pid
      );
      setTimeout(() => process.exit(1), 2000);
    });

    workers.push(worker);

    // Log worker resource usage every X seconds.
    setInterval(async () => {
      const usage = await worker.getResourceUsage();
      console.log('mediasoup Worker resource usage', worker.pid, usage);
    }, 120000);
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
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
        'rtx',
        'bwe',
        'score',
        'simulcast',
        'svc',
        'sctp',
      ],
      rtcMinPort: process.env.MEDIASOUP_MIN_PORT || 40000,
      rtcMaxPort: process.env.MEDIASOUP_MAX_PORT || 49999,
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
          ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '0.0.0.0',
        },
      ],
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxSctpMessageSize: 262144,
      // Additional options that are not part of WebRtcTransportOptions.
      maxIncomingBitrate: 1500000,
    },
    // mediasoup PlainTransport options for legacy RTP endpoints (FFmpeg,
    // GStreamer).
    // See https://mediasoup.org/documentation/v3/mediasoup/api/#PlainTransportOptions
    plainTransportOptions: {
      listenIp: {
        ip: process.env.MEDIASOUP_LISTEN_IP || '1.2.3.4',
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP,
      },
      maxSctpMessageSize: 262144,
    },
  },
};
