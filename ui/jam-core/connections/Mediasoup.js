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
  let sendingAudioStream = null;
  let sendingVideoStream = null;
  let audioProducer = null;
  let videoProducer = null;

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
  let canSendAudio = false;
  let canSendVideo = false;
  let sendTransport = null;
  let receiveTransport = null;

  return function Mediasoup({
    roomId,
    shouldSendAudio,
    shouldReceive,
    shouldSendVideo,
    localAudioStream,
    localVideoStream,
  }) {
    let wsConnected = use(swarm, 'connected');
    const {hub} = swarm;

    let shouldSend = shouldSendAudio || shouldSendVideo;

    shouldSendAudio = shouldSendAudio && !!localAudioStream;

    let [isMediasoupInfo, infoPayload] = useEvent(
      serverEvent,
      'mediasoup-info'
    );
    if (isMediasoupInfo) {
      canUseMediasoup = true;
      routerRtpCapabilities = infoPayload.rtpCapabilities;
    }

    // send & receive audio/video via SFU / mediasoup
    switch (mediasoupState) {
      case INITIAL:
        if (canUseMediasoup && (shouldReceive || shouldSend) && wsConnected) {
          connectedRoomId = roomId;
          mediasoupState = LOADING;
          (async () => {
            if (!mediasoupDevice.loaded) {
              await mediasoupDevice.load({routerRtpCapabilities});
            }
            canSendAudio = mediasoupDevice.canProduce('audio');
            canSendAudio = mediasoupDevice.canProduce('video');
            if (!canSendAudio) console.warn('Mediasoup: cannot send audio');
            if (!canSendVideo) console.warn('Mediasoup: cannot send video');

            let canSend = canSendAudio || canSendVideo;

            mediasoupState = READY;
            if (shouldReceive) initializeReceiving(hub);
            if (shouldSendAudio && canSend) initializeSending(hub);
          })();
        }
        break;
      case READY:
        if (!wsConnected || roomId !== connectedRoomId) {
          log('mediasoup: disconnecting');
          connectedRoomId = null;
          mediasoupState = INITIAL;
          sendState = INITIAL;
          sendingAudioStream = null;
          sendingVideoStream = null;
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
            if (shouldSendAudio && sendingAudioStream !== localAudioStream) {
              log('mediasoup: sending audio stream');
              sendingAudioStream = localAudioStream;
              sendLocalAudioStream(hub, localAudioStream);
            } else if (!shouldSend && sendingAudioStream) {
              log('mediasoup: removing audio stream');
              sendingAudioStream = null;
              removeLocalAudioStream(hub);
            }
            if (shouldSendVideo && sendingAudioStream !== localVideoStream) {
              log('mediasoup: sending audio stream');
              sendingVideoStream = localVideoStream;
              sendLocalVideoStream(hub, localVideoStream);
            } else if (!shouldSend && sendingAudioStream) {
              log('mediasoup: removing audio stream');
              sendingVideoStream = null;
              removeLocalVideoStream(hub);
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

          let trackType = track.kind;

          let i = newRemoteStreams.findIndex(
            s => s.peerId === peerId && s.name === trackType
          );
          if (i === -1) i = newRemoteStreams.length;
          newRemoteStreams[i] = {stream: newStream, name: trackType, peerId};

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

  async function sendLocalAudioStream(hub, localStream) {
    const track = localStream.getAudioTracks()[0];
    audioProducer = await sendTransport.produce({
      track,
      codecOptions: {
        opusStereo: 1,
        opusDtx: 1,
      },
    });

    audioProducer.on('transportclose', () => {
      audioProducer = null;
    });
  }

  async function sendLocalVideoStream(hub, localStream) {
    const track = localStream.getVideoTracks()[0];
    videoProducer = await sendTransport.produce({
      track,
      codecOptions: {
        opusStereo: 1,
        opusDtx: 1,
      },
    });

    videoProducer.on('transportclose', () => {
      videoProducer = null;
    });
  }

  function removeLocalAudioStream(hub) {
    let producerId = audioProducer.id;
    audioProducer.close();
    audioProducer = null;
    hub.sendRequest('mediasoup', {
      type: 'closeProducer',
      data: {producerId},
    });
  }

  function removeLocalVideoStream(hub) {
    let producerId = videoProducer.id;
    videoProducer.close();
    videoProducer = null;
    hub.sendRequest('mediasoup', {
      type: 'closeProducer',
      data: {producerId},
    });
  }
}
