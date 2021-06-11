import {Device} from 'mediasoup-client';
import {addLocalStream} from '../../lib/swarm';
import {use, useRootState, useEvent, useUpdate} from '../../lib/state-tree';
import {useStableArray} from '../../lib/state-diff';

const INITIAL = 0;
const LOADING = 1;
const READY = 2;
const ACTIVE = 3;

/* TODOs

- cleanup / stop sending stream etc
- send stream to mediasoup AND some selected peers via p2p (other stage members)
- => don't consume when you're stage member (or use consuming as fallback?)

*/

export default function ConnectAudio({swarm}) {
  const useMediasoup = true;

  let update = useUpdate();
  const {serverEvent} = swarm;
  let serverRemoteStreams = [];

  // states
  let mediasoupState = INITIAL;
  let sendState = INITIAL;
  let receiveState = INITIAL;

  let sendingStream = null;
  const mediasoupDevice = new Device();
  let canSend = false;
  let sendTransport = null;
  let receiveTransport = null;

  // TODO: handle roomId switches, like in ConnectRoom
  return function ConnectAudio({roomId, shouldSend, shouldReceive}) {
    let localStream = useRootState('myAudio');
    let wsConnected = use(swarm, 'connected');
    const {hub} = swarm;

    switch (mediasoupState) {
      case INITIAL:
        if ((shouldReceive || shouldSend) && wsConnected) {
          initializeMediasoup(hub, shouldSend, shouldReceive);
        }
        break;
      case READY:
        switch (sendState) {
          case INITIAL:
            if (shouldSend && wsConnected) initializeSending(hub);
            break;
          case READY:
            if (
              shouldSend &&
              localStream &&
              sendingStream !== localStream &&
              useMediasoup
            ) {
              sendLocalStream(hub, localStream);
            }
          // TODO: stop sending stream
        }
        switch (receiveState) {
          case INITIAL:
            if (shouldReceive && wsConnected) initializeReceiving(hub);
            break;
        }
        break;
    }

    let p2pRemoteStreams = use(swarm, 'remoteStreams');

    let [isConsumer, payload, accept] = useEvent(serverEvent, 'new-consumer');
    if (isConsumer) {
      let {peerId, producerId, id, kind, rtpParameters} = payload;
      [peerId] = peerId.split(';');
      receiveTransport
        .consume({id, producerId, kind, rtpParameters})
        .then(consumer => {
          consumer.on('transportclose', () => {
            /* TODO clean up possibly? */
          });
          accept();

          let newStream = new MediaStream([consumer._track]);
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

    let shouldSendStream = localStream && shouldSend && !useMediasoup;

    if (sendingStream !== localStream && shouldSendStream) {
      sendingStream = localStream;
      addLocalStream(swarm, localStream, 'audio');
    } else if (sendingStream && !shouldSendStream) {
      sendingStream = null;
      addLocalStream(swarm, null, 'audio');
    }

    // TODO: has two streams if same peer sends over both channels, but only one is played
    let remoteStreams = useStableArray([
      ...p2pRemoteStreams,
      ...serverRemoteStreams,
    ]);
    return remoteStreams;
  };

  async function initializeMediasoup(hub, shouldSend, shouldReceive) {
    mediasoupState = LOADING;
    let routerRtpCapabilities = await hub.sendRequest('mediasoup', {
      type: 'getRouterRtpCapabilities',
    });
    await mediasoupDevice.load({routerRtpCapabilities});
    canSend = mediasoupDevice.canProduce('audio');
    if (!canSend) console.warn('Mediasoup: cannot send audio');

    mediasoupState = READY;

    // FIXME: shouldReceive = false causes error on server side
    if (shouldReceive) initializeReceiving(hub).then(() => join(hub));
    else join(hub);

    if (shouldSend && canSend) initializeSending(hub);
  }

  async function join(hub) {
    await hub.sendRequest('mediasoup', {
      type: 'join',
      data: {
        rtpCapabilities: mediasoupDevice.rtpCapabilities,
      },
    });
    update();
  }

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

  async function sendLocalStream(hub, localStream) {
    sendState = LOADING;
    const track = localStream.getAudioTracks()[0];
    let producer = await sendTransport.produce({
      track,
      // TODO:
      // codecOptions: {
      //   opusStereo: 1,
      //   opusDtx: 1,
      // },
      // codec: mediasoupDevice.rtpCapabilities.codecs
      // 	.find(codec => codec.mimeType.toLowerCase() === 'audio/pcma')
    });
    sendState = ACTIVE;

    producer.on('transportclose', () => {
      // producer = null;
    });

    producer.on('trackended', async () => {
      // TODO notify about mic disconnect
      producer.close();
      await hub.sendRequest('mediasoup', {
        type: 'closeProducer',
        data: {producerId: producer.id},
      });
      // TODO notify app about removing producer
      // producer = null;
    });
  }
}
