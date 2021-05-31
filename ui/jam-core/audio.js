import {addLocalStream} from '../lib/swarm';
import hark from '../lib/hark';
import {is, update} from 'use-minimal-state';
import log from '../lib/causal-log';
import {domEvent} from '../lib/util';
import {until, useDidChange} from '../lib/state-utils';
import {
  useState,
  declare,
  use,
  useRootState,
  useOn,
  useAction,
} from '../lib/state-tree';
import {userAgent} from '../lib/user-agent';
import Microphone from './audio/Microphone';
import AudioFile from './audio/AudioFile';
const AudioContext = window.AudioContext || window.webkitAudioContext;

export {AudioState};

function AudioState({swarm}) {
  const state = useRootState();
  const audios = {}; // {peerId: HTMLAudioElement}
  let audioContext = null;

  // not clear whether this improves anything for Safari, could try to remove
  useOn(swarm, 'newPeer', peerId => {
    if (!audios[peerId]) {
      audios[peerId] = new Audio();
      audios[peerId].muted = state.soundMuted;
    }
  });

  return function AudioState({inRoom, userInteracted}) {
    let [myId, iAmSpeaker, handRaised, micMuted, audioFile] = useRootState([
      'myId',
      'iAmSpeaker',
      'handRaised',
      'micMuted',
      'audioFile',
    ]);

    if (userInteracted && audioContext === null && AudioContext) {
      audioContext = new AudioContext();
    }

    let shouldHaveMic = !!(inRoom && (iAmSpeaker || handRaised));
    let {micStream, hasRequestedOnce} = use(Microphone, {shouldHaveMic});
    let {audioFileStream, audioFileElement} = use(AudioFile, {
      audioFile,
      audioContext,
    });

    let myAudio = audioFileStream ?? micStream;
    declare(Muted, {myAudio, micMuted});
    declare(ConnectMyAudio, {myAudio, iAmSpeaker, myId, swarm});
    let soundMuted = !inRoom || (iAmSpeaker && !hasRequestedOnce);

    let remoteStreams = use(swarm, 'remoteStreams');
    remoteStreams.map(({peerId, stream}) =>
      declare(AudioElement, {
        key: peerId,
        audioContext,
        audios,
        stream,
        soundMuted,
        inRoom,
      })
    );

    return {myAudio, soundMuted, audioFileElement, audioContext};
  };
}

function AudioElement({audios, key, soundMuted}) {
  const state = useRootState();
  let activeStream = null;

  let audio = audios[key];
  if (!audio) {
    audio = new Audio();
    audios[key] = audio;
    audio.muted = soundMuted;
  }

  return function AudioElement({stream, audioContext, soundMuted, inRoom}) {
    let shouldPlay = false;
    let newStream = activeStream !== stream && stream;
    let newAudioContext = useDidChange(audioContext);

    if (newStream) {
      activeStream = stream;

      audio.removeAttribute('srcObject');
      audio.load(); // this can cause a previous play() to reject
      audio.srcObject = stream;

      if (inRoom) {
        shouldPlay = true;
      }
    }
    if ((newStream || newAudioContext) && audioContext) {
      connectVolumeMeter(state, key, stream.clone());
    }

    if (useDidChange(soundMuted)) {
      audio.muted = soundMuted;
      if (!soundMuted && audio.paused) {
        shouldPlay = true;
      }
    }

    if (shouldPlay) {
      play(audio).catch(err => {
        if (stream === activeStream) {
          console.warn(err);
          if (inRoom) {
            is(state, 'audioPlayError', true);
          }
        } else {
          // call to play() was for a an older stream, error caused by racing new stream
          // => all good, don't set error!
        }
      });
    }

    let [isRetrySound] = useAction('retry-audio-play');
    if (isRetrySound) {
      if (audio.paused) play(audio).catch(console.warn);
    }
  };
}

function Muted({myAudio, micMuted}) {
  if (myAudio) {
    for (let track of myAudio.getTracks()) {
      if (track.enabled !== !micMuted) {
        track.enabled = !micMuted;
      }
    }
  }
}

function ConnectMyAudio() {
  const state = useRootState();

  return function ConnectMyAudio({myAudio, iAmSpeaker, myId, swarm}) {
    let [connected, setConnected] = useState(null);
    let shouldConnect = myAudio && iAmSpeaker;

    if (connected !== myAudio && shouldConnect) {
      connectVolumeMeter(state, myId, myAudio);
      addLocalStream(swarm, myAudio, 'audio');
      setConnected(myAudio);
    } else if (connected && !shouldConnect) {
      disconnectVolumeMeter(myId);
      addLocalStream(swarm, null, 'audio');
      setConnected(null);
    }
  };
}

function play(audio) {
  // we make sure that audio.play() is called synchronously so the browser has an easier time
  // seeing that the first play was caused by user interaction
  log('playing audio on engine', userAgent.engine.name);
  if (userAgent.engine.name === 'WebKit') {
    // HACK for Safari audio output bug
    return audio
      .play()
      .then(() => {
        let onpause = domEvent(audio, 'pause');
        audio.pause();
        return onpause;
      })
      .then(() => audio.play());
  } else {
    return audio.play();
  }
}

let volumeMeters = {};
async function connectVolumeMeter(state, peerId, stream) {
  if (!stream) {
    disconnectVolumeMeter(peerId);
    return;
  }
  // await audio context
  await until(state, 'audioContext');

  let options = {audioContext: state.audioContext};
  let volumeMeter = hark(stream, options);

  volumeMeter.on('speaking', () => {
    state.speaking.add(peerId);
    update(state, 'speaking');
  });

  volumeMeter.on('stopped_speaking', () => {
    state.speaking.delete(peerId);
    update(state, 'speaking');
  });

  disconnectVolumeMeter(peerId);
  volumeMeters[peerId] = volumeMeter;
}

function disconnectVolumeMeter(peerId) {
  let volumeMeter = volumeMeters[peerId];
  if (volumeMeter) volumeMeter.stop();
  volumeMeters[peerId] = null;
}
