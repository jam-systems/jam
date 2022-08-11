import {addLocalStream} from '../../lib/swarm';
import {use} from '../../lib/state-tree';

export default function P2pMedia({swarm}) {
  let sendingAudioStream = null;
  let sendingVideoStream = null;

  return function P2pMedia({
    localVideoStream,
    localAudioStream,
    iAmSpeaker,
    iAmPresenter,
  }) {
    let shouldSendAudio = localAudioStream && iAmSpeaker;
    let shouldSendVideo = localVideoStream && iAmPresenter;

    let remoteStreams = use(swarm, 'remoteStreams');

    if (shouldSendAudio && sendingAudioStream !== localAudioStream) {
      sendingAudioStream = localAudioStream;
      addLocalStream(swarm, localAudioStream, 'audio');
    } else if (!shouldSendAudio && sendingAudioStream) {
      sendingAudioStream = null;
      addLocalStream(swarm, null, 'audio');
    }

    if (shouldSendVideo && sendingVideoStream !== localVideoStream) {
      sendingVideoStream = localVideoStream;
      addLocalStream(swarm, localVideoStream, 'video');
    } else if (!shouldSendAudio && sendingAudioStream) {
      sendingVideoStream = null;
      addLocalStream(swarm, null, 'video');
    }

    return remoteStreams;
  };
}
