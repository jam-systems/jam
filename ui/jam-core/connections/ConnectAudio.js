import {Device} from 'mediasoup-client';
import {addLocalStream} from '../../lib/swarm';
import {use, useRootState, useEvent, useUpdate} from '../../lib/state-tree';
import {useStableArray} from '../../lib/state-diff';

const INITIAL = 0;
const LOADING = 1;
const READY = 2;

export default function ConnectAudio({swarm, hasMediasoup}) {
  const sendViaMediasoup = hasMediasoup;
  const sendViaP2p = true;

  let update = useUpdate();
  const {serverEvent} = swarm;
  let serverRemoteStreams = [];

  // states
  let mediasoupState = INITIAL;
  let sendState = INITIAL;
  let receiveState = INITIAL;

  let connectedRoomId = null;
  let sendingStreamMediasoup = null;
  let sendingStreamP2p = null;
  let producer = null;

  let canUseMediasoup = false;
  let routerRtpCapabilities = null;
  const mediasoupDevice = new Device();
  let canSend = false;
  let sendTransport = null;
  let receiveTransport = null;

  return function ConnectAudio({roomId, iAmSpeaker}) {
    let localStream = useRootState('myAudio');
    let wsConnected = use(swarm, 'connected');
    const {hub} = swarm;

    let shouldSend = iAmSpeaker;
    let shouldSendMediasoup = sendViaMediasoup && localStream && shouldSend;
    let shouldSendP2p = sendViaP2p && localStream && shouldSend;

    let shouldReceiveMediasoup = hasMediasoup && !iAmSpeaker;

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
        if (
          canUseMediasoup &&
          (shouldReceiveMediasoup || shouldSendMediasoup) &&
          wsConnected
        ) {
          connectedRoomId = roomId;
          mediasoupState = LOADING;
          (async () => {
            if (!mediasoupDevice.loaded) {
              await mediasoupDevice.load({routerRtpCapabilities});
            }
            canSend = mediasoupDevice.canProduce('audio');
            if (!canSend) console.warn('Mediasoup: cannot send audio');

            mediasoupState = READY;
            if (shouldReceiveMediasoup) initializeReceiving(hub);
            if (shouldSendMediasoup && canSend) initializeSending(hub);
          })();
        }
        break;
      case READY:
        if (!wsConnected || roomId !== connectedRoomId) {
          connectedRoomId = null;
          sendState = INITIAL;
          receiveState = INITIAL;
          mediasoupState = INITIAL;
          producer = null;
          sendingStreamMediasoup = null;
          stopReceiving();
          if (wsConnected) update();
          break;
        }

        switch (sendState) {
          case INITIAL:
            if (shouldSendMediasoup && wsConnected) initializeSending(hub);
            break;
          case READY:
            if (shouldSendMediasoup && sendingStreamMediasoup !== localStream) {
              sendingStreamMediasoup = localStream;
              sendLocalStream(hub, localStream);
            } else if (!shouldSendMediasoup && sendingStreamMediasoup) {
              sendingStreamMediasoup = null;
              removeLocalStream(hub);
            }
        }
        switch (receiveState) {
          case INITIAL:
            if (shouldReceiveMediasoup && wsConnected) initializeReceiving(hub);
            break;
          case READY:
            if (!shouldReceiveMediasoup) {
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
      [peerId] = peerId.split(';');
      receiveTransport
        .consume({id, producerId, kind, rtpParameters})
        .then(consumer => {
          accept();
          let track = consumer.track;
          if (!track) return;
          let newStream = new MediaStream([track]);
          let newRemoteStreams = [...serverRemoteStreams];
          let i = newRemoteStreams.findIndex(
            s => s.peerId === peerId && s.name === 'audio'
          );
          if (i === -1) i = newRemoteStreams.length;
          newRemoteStreams[i] = {stream: newStream, name: 'audio', peerId};

          serverRemoteStreams = newRemoteStreams;
          update();
        })
        .catch(console.error);
    }

    // send & receive audio via p2p webRTC
    let p2pRemoteStreams = use(swarm, 'remoteStreams');
    // for now, to simulate no p2p stream arriving at audience
    if (!iAmSpeaker && hasMediasoup) p2pRemoteStreams = [];

    if (shouldSendP2p && sendingStreamP2p !== localStream) {
      sendingStreamP2p = localStream;
      addLocalStream(swarm, localStream, 'audio');
    } else if (!shouldSendP2p && sendingStreamP2p) {
      sendingStreamP2p = null;
      addLocalStream(swarm, null, 'audio');
    }

    // merge remote streams from both sources
    let remoteStreams = useStableArray([
      ...p2pRemoteStreams,
      ...serverRemoteStreams.filter(
        ({peerId}) => !p2pRemoteStreams.find(x => x.peerId === peerId)
      ),
    ]);
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
        forceTcp: false,
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
        forceTcp: false, // I guess
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
    serverRemoteStreams = [];
    receiveTransport.close();
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
