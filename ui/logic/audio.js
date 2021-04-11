import swarm from '../lib/swarm';
import hark from '../lib/hark';
import UAParser from 'ua-parser-js';
import state from './state';
import {is, set} from 'use-minimal-state';
import identity from './identity';
import log from '../lib/causal-log';
import {domEvent, until} from './util';
import {openModal} from '../views/Modal';
import InteractionModal from '../views/InteractionModal';
import AudioPlayerToast from '../views/AudioPlayerToast';

var userAgent = UAParser();

export {requestAudio, stopAudio, requestMicPermissionOnly};

state.on('myAudio', myAudio => {
  // if i am speaker, send audio to peers
  if (state.iAmSpeaker && myAudio) {
    connectVolumeMeter(identity.publicKey, myAudio);
    swarm.addLocalStream(myAudio, 'audio', myAudio =>
      state.set('myAudio', myAudio)
    );
  }
  if (!myAudio) {
    disconnectVolumeMeter(identity.publicKey);
    swarm.addLocalStream(null, 'audio');
  }
});

state.on('iAmSpeaker', iAmSpeaker => {
  if (iAmSpeaker) {
    // send audio stream when I become speaker
    let {myAudio} = state;
    if (myAudio) {
      connectVolumeMeter(identity.publicKey, myAudio);
      swarm.addLocalStream(myAudio, 'audio', myAudio =>
        state.set('myAudio', myAudio)
      );
    } else {
      // or request audio if not on yet
      if (state.inRoom) requestAudio();
    }
  } else {
    // stop sending stream when I become audience member
    stopAudio();
  }
});

let audios = {};
state.on('soundMuted', muted => {
  for (let id in audios) {
    let audio = audios[id];
    audio.muted = muted;
    if (!muted && audio.paused) playOrShowModal(audio);
  }
});

swarm.on('newPeer', id => getAudio(id));

swarm.on('stream', (stream, name, peer) => {
  log('remote stream', name, stream);
  let id = peer.peerId;
  if (!stream) return;
  connectVolumeMeter(id, stream.clone());
  let audio = getAudio(id);
  audio.srcObject = stream;
  playOrShowModal(audio);
});

function getAudio(id) {
  if (!audios[id]) {
    let audio = new Audio();
    audios[id] = audio;
    audio.muted = state.soundMuted;
  }
  return audios[id];
}

function playOrShowModal(audio) {
  return play(audio).catch(err => {
    console.warn(err);
    if (state.inRoom) {
      openModal(InteractionModal, {}, 'interaction');
    }
  });
}

async function play(audio) {
  // HACK for Safari audio output bug
  log('playing audio on engine', userAgent.engine.name);
  if (userAgent.engine.name === 'WebKit') {
    let onplay = domEvent(audio, 'play');
    await audio.play();
    await onplay;
    let onpause = domEvent(audio, 'pause');
    audio.pause();
    await onpause;
  }
  return audio.play();
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
      state.set('micMuted', true);
      state.set('micAllowed', false);
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
  state.set('micAllowed', !!stream);
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

state.on('micMuted', micMuted => {
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
  swarm.set('sharedState', state => ({...state, micMuted}));
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
    state.update('speaking');
  });

  volumeMeter.on('stopped_speaking', () => {
    state.speaking.delete(peerId);
    state.update('speaking');
  });

  disconnectVolumeMeter(peerId);
  volumeMeters[peerId] = volumeMeter;
}

function disconnectVolumeMeter(peerId) {
  let volumeMeter = volumeMeters[peerId];
  if (volumeMeter) volumeMeter.stop();
  volumeMeters[peerId] = null;
}

state.on('userInteracted', i => i && createAudioContext());
function createAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext && !state.audioContext) {
    state.set('audioContext', new AudioContext());
  } //  else {
  //   state.audioContext.resume();
  // }
}
