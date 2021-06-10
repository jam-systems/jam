import {} from 'mediasoup-client';
import {addLocalStream} from '../../lib/swarm';
import {use, useRootState, useEvent} from '../../lib/state-tree';

export default function ConnectAudio({swarm}) {
  let sendingStream = null;
  const {serverEvent} = swarm;

  return function ConnectAudio({roomId, shouldSend, shouldReceive}) {
    let localStream = useRootState('myAudio');

    let remoteStreams = use(swarm, 'remoteStreams');
    let [isConsumer, consumer, accept] = useEvent(serverEvent, 'new-consumer');
    if (isConsumer) {
      console.log('got new consumer', consumer);
      // do something in mediasoup with the consumer
      // accept()
    }

    shouldSend = localStream && shouldSend;

    if (sendingStream !== localStream && shouldSend) {
      sendingStream = localStream;
      addLocalStream(swarm, localStream, 'audio');
    } else if (sendingStream && !shouldSend) {
      sendingStream = null;
      addLocalStream(swarm, null, 'audio');
    }

    return remoteStreams;
  };
}
