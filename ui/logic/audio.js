import {addLocalStream} from '../lib/swarm';
import hark from '../lib/hark';
import UAParser from 'ua-parser-js';
import state, {swarm} from './state';
import {is, on, set, update} from 'use-minimal-state';
import {currentId} from './identity';
import log from '../lib/causal-log';
import {domEvent, until} from './util';
import {openModal} from '../views/Modal';
import InteractionModal from '../views/InteractionModal';
import AudioPlayerToast from '../views/AudioPlayerToast';

var userAgent = UAParser();

export {requestAudio, stopAudio, requestMicPermissionOnly};

on(state, 'myAudio', myAudio => {
  // if i am speaker, send audio to peers
  if (state.iAmSpeaker && myAudio) {
    connectVolumeMeter(currentId(), myAudio);
    addLocalStream(swarm, myAudio, 'audio');
  }
  if (!myAudio) {
    disconnectVolumeMeter(currentId());
    addLocalStream(swarm, null, 'audio');
  }
});

on(state, 'iAmSpeaker', iAmSpeaker => {
  if (iAmSpeaker) {
    // send audio stream when I become speaker
    let {myAudio} = state;
    if (myAudio) {
      connectVolumeMeter(currentId(), myAudio);
      addLocalStream(swarm, myAudio, 'audio');
    } else {
      // or request audio if not on yet
      if (state.inRoom) requestAudio();
    }
  } else {
    // stop sending stream when I become audience member
    stopAudio();
  }
});

const audios = {}; // {peerId: HTMLAudioElement}

on(state, 'soundMuted', muted => {
  for (let peerId in audios) {
    let audio = audios[peerId];
    audio.muted = muted;
    if (!muted && audio.paused) playOrShowModal(peerId, audio);
  }
});

on(swarm, 'newPeer', peerId => getAudio(peerId));

on(swarm, 'stream', (stream, name, peer) => {
  log('remote stream', name, stream);
  let peerId = peer.peerId;
  if (!stream) return;
  connectVolumeMeter(peerId, stream.clone());
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

function play(audio) {
  // we make sure that audio.play() is called *synchronously* so the browser has an easier time
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

let isRequestingAudio = false;
async function requestAudio() {
  if (state.myMic && state.myMic.active) return;
  if (isRequestingAudio) return;
  isRequestingAudio = true;
  let stream = await navigator.mediaDevices
    .getUserMedia({
      video: false,
      audio: true,
    })
    .catch(err => {
      console.error('error getting mic');
      console.error(err);
      set(state, 'micMuted', true);
      set(state, 'micAllowed', false);
    });
  isRequestingAudio = false;
  if (!stream) return;
  set(state, 'myMic', stream);
  set(state, 'myAudio', stream);
  set(state, 'micAllowed', true);
  set(state, 'micMuted', false);
}

export async function streamAudioFromUrl(url, name) {
  let audio = new Audio(url);
  audio.crossOrigin = 'anonymous';
  // let stream = audio.captureStream(); // not supported in Safari & Firefox
  let ctx = state.audioContext;
  let streamDestination = ctx.createMediaStreamDestination();
  let source = ctx.createMediaElementSource(audio);
  source.connect(streamDestination);
  source.connect(ctx.destination);
  let stream = streamDestination.stream;

  set(state, 'myAudio', stream);
  await audio.play();
  openModal(AudioPlayerToast, {audio, name}, 'player');
  await domEvent(audio, 'ended');
  if (state.myMic) set(state, 'myAudio', state.myMic);
}

async function requestMicPermissionOnly() {
  if (state.micAllowed) {
    return true;
  }
  let stream = await navigator.mediaDevices
    .getUserMedia({
      video: false,
      audio: true,
    })
    .catch(err => {
      console.error('error getting mic');
      console.error(err);
    });
  set(state, 'micAllowed', !!stream);
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  return !!stream;
}

async function stopAudio() {
  if (state.myMic) {
    state.myMic.getTracks().forEach(track => track.stop());
  }
  is(state, 'myMic', null);
  is(state, 'myAudio', null);
}

on(state, 'micMuted', micMuted => {
  let {myAudio, myMic} = state;
  if (!myAudio?.active && !micMuted) {
    requestAudio();
    return;
  }
  if (myAudio) {
    for (let track of myAudio.getTracks()) {
      track.enabled = !micMuted;
    }
  }
  if (myMic && myMic !== myAudio) {
    for (let track of myMic.getTracks()) {
      track.enabled = !micMuted;
    }
  }
  set(swarm, 'sharedState', state => ({...state, micMuted}));
});

let volumeMeters = {};
async function connectVolumeMeter(peerId, stream) {
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

on(state, 'userInteracted', i => i && createAudioContext());
function createAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext && !state.audioContext) {
    set(state, 'audioContext', new AudioContext());
  } //  else {
  //   state.audioContext.resume();
  // }
}
