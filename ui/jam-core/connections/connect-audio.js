import {} from 'mediasoup-client';
import {addLocalStream} from '../../lib/swarm';
import {use, Atom} from '../../lib/state-tree';

export function SendAudio({swarm}) {
  let sendingStream = null;

  return function SendAudio({roomId, localStream, shouldSend}) {
    if (sendingStream !== localStream && shouldSend) {
      sendingStream = localStream;
      addLocalStream(swarm, localStream, 'audio');
    } else if (sendingStream && !shouldSend) {
      sendingStream = null;
      addLocalStream(swarm, null, 'audio');
    }
  };
}

export function ReceiveAudio({swarm}) {
  return function ReceiveAudio({roomId, shouldReceive}) {
    let remoteStreams = use(swarm, 'remoteStreams');
    return Atom(remoteStreams);
  };
}
