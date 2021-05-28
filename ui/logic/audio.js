import {addLocalStream} from '../lib/swarm';
import hark from '../lib/hark';
import {swarm} from './state';
import {set, update} from 'use-minimal-state';
import {currentId} from './identity';
import log from '../lib/causal-log';
import {domEvent} from '../lib/util';
import {openModal} from '../views/Modal';
import InteractionModal from '../views/InteractionModal';
import {until} from '../lib/state-utils';
import {useState, declare, use, useRootState, useOn} from '../lib/state-tree';
import {userAgent} from '../lib/user-agent';
import Microphone from './audio/Microphone';
import AudioFile from './audio/AudioFile';

export {AudioState};

function AudioState() {
  const state = useRootState();
  const audios = {}; // {peerId: HTMLAudioElement}

  useOn(state, 'userInteracted', i => i && createAudioContext());
  function createAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext && !state.audioContext) {
      set(state, 'audioContext', new AudioContext());
    } //  else {
    //   state.audioContext.resume();
    // }
  }

  useOn(state, 'soundMuted', muted => {
    for (let peerId in audios) {
      let audio = audios[peerId];
      audio.muted = muted;
      if (!muted && audio.paused) playOrShowModal(peerId, audio);
    }
  });

  useOn(swarm, 'newPeer', peerId => getAudio(peerId));

  useOn(swarm, 'stream', (stream, name, peer) => {
    log('remote stream', name, stream);
    let peerId = peer.peerId;
    if (!stream) return;
    connectVolumeMeter(state, peerId, stream.clone());
    let audio = getAudio(peerId);

    audio.removeAttribute('srcObject');
    audio.load(); // this can cause a previous play() to reject
    audio.srcObject = stream;
    if (state.inRoom) playOrShowModal(peerId, audio);
  });

  function getAudio(peerId) {
    if (!audios[peerId]) {
      let audio = new Audio();
      audios[peerId] = audio;
      audio.muted = state.soundMuted;
    }
    return audios[peerId];
  }

  function onConfirmModal() {
    for (let peerId in audios) {
      let audio = audios[peerId];
      if (audio.paused) play(audio).catch(console.warn);
    }
  }

  // FIXME: opening modals from state routines breaks UI / state separation
  function playOrShowModal(peerId, audio) {
    let stream = audio.srcObject;
    return play(audio).catch(err => {
      let currentStream = swarm.remoteStreams.find(s => s.peerId === peerId)
        ?.stream;
      if (stream !== currentStream) {
        // call to play() was for a an older stream, error caused by racing new stream
        // => all good, don't show modal!
        return;
      }
      console.warn(err);
      if (state.inRoom) {
        openModal(InteractionModal, {submit: onConfirmModal}, 'interaction');
      }
    });
  }

  return function AudioState({inRoom}) {
    let [
      iAmSpeaker,
      handRaised,
      audioContext,
      micMuted,
      audioFile,
    ] = useRootState([
      'iAmSpeaker',
      'handRaised',
      'audioContext',
      'micMuted',
      'audioFile',
    ]);

    let shouldHaveMic = !!(inRoom && (iAmSpeaker || handRaised));
    let {micStream, hasRequestedOnce} = use(Microphone, {shouldHaveMic});
    let {audioFileStream, audioFileElement} = use(AudioFile, {
      audioFile,
      audioContext,
    });

    let myAudio = audioFileStream ?? micStream;
    declare(Muted, {myAudio, micMuted});
    declare(ConnectMyAudio, {myAudio, iAmSpeaker});
    let soundMuted = inRoom ? iAmSpeaker && !hasRequestedOnce : true;

    return {myAudio, soundMuted, audioFileElement};
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

  return function ConnectMyAudio({myAudio, iAmSpeaker}) {
    let [connected, setConnected] = useState(null);
    let shouldConnect = myAudio && iAmSpeaker;

    if (connected !== myAudio && shouldConnect) {
      connectVolumeMeter(state, currentId(), myAudio);
      addLocalStream(swarm, myAudio, 'audio');
      setConnected(myAudio);
    } else if (connected && !shouldConnect) {
      disconnectVolumeMeter(currentId());
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
