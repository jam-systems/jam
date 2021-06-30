import {addLocalStream} from '../../lib/swarm';
import {use} from '../../lib/state-tree';

export default function P2pAudio({swarm}) {
  let sendingStream = null;

  return function P2pAudio({localStream, iAmSpeaker}) {
    let shouldSend = localStream && iAmSpeaker;

    let remoteStreams = use(swarm, 'remoteStreams');

    if (shouldSend && sendingStream !== localStream) {
      sendingStream = localStream;
      addLocalStream(swarm, localStream, 'audio');
    } else if (!shouldSend && sendingStream) {
      sendingStream = null;
      addLocalStream(swarm, null, 'audio');
    }

    return remoteStreams;
  };
}
