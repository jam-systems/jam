import {Device} from 'mediasoup-client';
import log from '../../lib/causal-log';
import {use, useEvent, useUpdate} from '../../lib/state-tree';

const INITIAL = 0;
const LOADING = 1;
const READY = 2;

export default function Mediasoup({swarm}) {
  let update = useUpdate();
  const {serverEvent} = swarm;
  let remoteStreams = [];

  // states
  let mediasoupState = INITIAL;
  let sendState = INITIAL;
  let receiveState = INITIAL;

  let connectedRoomId = null;
  let sendingStream = null;
  let producer = null;

  let canUseMediasoup = false;
  let routerRtpCapabilities = null;
  let mediasoupDevice;
  try {
    mediasoupDevice = new Device();
  } catch (err) {
    console.warn(err);
    // avoid UnsupportedError in non-standard environments, e.g. WebViews
    mediasoupDevice = new Device({handlerName: 'Chrome74'});
  }
  let canSend = false;
  let sendTransport = null;
  let receiveTransport = null;

  return function Mediasoup({roomId, shouldSend, shouldReceive, localStream}) {
    let wsConnected = use(swarm, 'connected');
    const {hub} = swarm;

    shouldSend = shouldSend && !!localStream;

    let [isMediasoupInfo, infoPayload] = useEvent(
      serverEvent,
      'mediasoup-info'
    );
    if (isMediasoupInfo) {
      canUseMediasoup = true;
      routerRtpCapabilities = infoPayload.rtpCapabilities;
    }

    // send & receive audio via SFU / mediasoup
    switch (mediasoupState) {
      case INITIAL:
        if (canUseMediasoup && (shouldReceive || shouldSend) && wsConnected) {
          connectedRoomId = roomId;
          mediasoupState = LOADING;
          (async () => {
            if (!mediasoupDevice.loaded) {
              await mediasoupDevice.load({routerRtpCapabilities});
            }
            canSend = mediasoupDevice.canProduce('audio');
            if (!canSend) console.warn('Mediasoup: cannot send audio');

            mediasoupState = READY;
            if (shouldReceive) initializeReceiving(hub);
            if (shouldSend && canSend) initializeSending(hub);
          })();
        }
        break;
      case READY:
        if (!wsConnected || roomId !== connectedRoomId) {
          log('mediasoup: disconnecting');
          connectedRoomId = null;
          mediasoupState = INITIAL;
          sendState = INITIAL;
          sendingStream = null;
          sendTransport?.close();
          sendTransport = null;
          stopReceiving();
          if (wsConnected) update();
          break;
        }

        switch (sendState) {
          case INITIAL:
            if (shouldSend && wsConnected) initializeSending(hub);
            break;
          case READY:
            if (shouldSend && sendingStream !== localStream) {
              log('mediasoup: sending stream');
              sendingStream = localStream;
              sendLocalStream(hub, localStream);
            } else if (!shouldSend && sendingStream) {
              log('mediasoup: removing stream');
              sendingStream = null;
              removeLocalStream(hub);
            }
        }
        switch (receiveState) {
          case INITIAL:
            if (shouldReceive && wsConnected) initializeReceiving(hub);
            break;
          case READY:
            if (!shouldReceive) {
              stopReceiving();
            }
        }
        break;
    }

    let [isConsumer, consumerPayload, accept] = useEvent(
      serverEvent,
      'new-consumer'
    );
    if (isConsumer) {
      let {peerId, producerId, id, kind, rtpParameters} = consumerPayload;
      [peerId] = peerId.split('.');
      receiveTransport
        ?.consume({id, producerId, kind, rtpParameters})
        .then(consumer => {
          accept();
          let track = consumer.track;
          if (!track) return;
          let newStream = new MediaStream([track]);
          let newRemoteStreams = [...remoteStreams];
          let i = newRemoteStreams.findIndex(
            s => s.peerId === peerId && s.name === 'audio'
          );
          if (i === -1) i = newRemoteStreams.length;
          newRemoteStreams[i] = {stream: newStream, name: 'audio', peerId};

          remoteStreams = newRemoteStreams;
          update();
        })
        .catch(console.error);
    }

    return remoteStreams;
  };

  async function initializeSending(hub) {
    sendState = LOADING;
    const {
      id,
      iceParameters,
      iceCandidates,
      dtlsParameters,
    } = await hub.sendRequest('mediasoup', {
      type: 'createWebRtcTransport',
      data: {
        producing: true,
        consuming: false,
        rtpCapabilities: mediasoupDevice.rtpCapabilities,
      },
    });

    sendTransport = mediasoupDevice.createSendTransport({
      id,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      iceServers: [],
    });
    sendState = READY;

    sendTransport.on('connect', ({dtlsParameters}, callback, errback) => {
      hub
        .sendRequest('mediasoup', {
          type: 'connectWebRtcTransport',
          data: {
            transportId: sendTransport.id,
            dtlsParameters,
          },
        })
        .then(callback)
        .catch(errback);
    });

    sendTransport.on(
      'produce',
      async ({kind, rtpParameters, appData}, callback, errback) => {
        try {
          const {id} = await hub.sendRequest('mediasoup', {
            type: 'produce',
            data: {
              transportId: sendTransport.id,
              kind,
              rtpParameters,
              appData,
            },
          });
          callback({id});
        } catch (error) {
          errback(error);
        }
      }
    );
    update();
  }

  async function initializeReceiving(hub) {
    receiveState = LOADING;
    const {
      id,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      sctpParameters,
    } = await hub.sendRequest('mediasoup', {
      type: 'createWebRtcTransport',
      data: {
        producing: false,
        consuming: true,
        rtpCapabilities: mediasoupDevice.rtpCapabilities,
      },
    });

    receiveTransport = mediasoupDevice.createRecvTransport({
      id,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      sctpParameters,
      iceServers: [],
    });
    receiveState = READY;

    receiveTransport.on('connect', ({dtlsParameters}, callback, errback) => {
      hub
        .sendRequest('mediasoup', {
          type: 'connectWebRtcTransport',
          data: {
            transportId: receiveTransport.id,
            dtlsParameters,
          },
        })
        .then(callback)
        .catch(errback);
    });
    update();
  }

  function stopReceiving() {
    receiveState = INITIAL;
    remoteStreams = [];
    receiveTransport?.close();
    receiveTransport = null;
  }

  async function sendLocalStream(hub, localStream) {
    const track = localStream.getAudioTracks()[0];
    producer = await sendTransport.produce({
      track,
      codecOptions: {
        opusStereo: 1,
        opusDtx: 1,
      },
    });

    producer.on('transportclose', () => {
      producer = null;
    });
  }

  function removeLocalStream(hub) {
    let producerId = producer.id;
    producer.close();
    producer = null;
    hub.sendRequest('mediasoup', {
      type: 'closeProducer',
      data: {producerId},
    });
  }
}
