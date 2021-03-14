import swarm from '../lib/swarm';
import hark from 'hark';
import UAParser from 'ua-parser-js';
import state from './state';
import {is, next} from 'use-minimal-state';
import identity from './identity';
import log from '../lib/causal-log';
import {domEvent} from './util';

var userAgent = UAParser();

export {requestAudio, stopAudio, requestMicPermissionOnly};

state.on('myAudio', myAudio => {
  // if i am speaker, send audio to peers
  if (state.iAmSpeaker) {
    connectVolumeMeter(identity.publicKey, myAudio);
    swarm.addLocalStream(myAudio, 'audio', myAudio =>
      state.set('myAudio', myAudio)
    );
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
    disconnectVolumeMeter(identity.publicKey);
    swarm.addLocalStream(null, 'audio');
    // stopAudio();
  }
});

let speaker = {};
state.on('soundMuted', muted => {
  for (let id in speaker) {
    speaker[id].muted = muted;
  }
});

swarm.on('stream', async (stream, name, peer) => {
  log('remote stream', name, stream);
  let id = peer.peerId;
  if (!stream) {
    delete speaker[id];
    return;
  }
  let audio = new Audio();
  speaker[id] = audio;
  audio.srcObject = stream;
  audio.muted = state.soundMuted;
  try {
    await play(audio);
  } catch (err) {
    await next(state, 'userInteracted');
    await play(audio);
  }
  await connectVolumeMeter(id, stream);
});

async function play(audio) {
  // HACK for Safari audio output bug
  log('playing audio on engine', userAgent.engine.name);
  if (userAgent.engine.name === 'WebKit' || 1 + 1 === 2) {
    audio.addEventListener('play', () => {
      console.log('PLAAAAAAAAAAAAYYYYYYYYYYYYY');
    });
    await audio.play();
    await audio.pause();
    return audio.play();
    // await domEvent(audio, 'play');
    // await domEvent(audio, 'pause');
    // return domEvent(audio, 'play');
  } else {
    return audio.play();
  }
}

async function requestAudio() {
  if (state.myAudio && state.myAudio.active) {
    return state.myAudio;
  }
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
  if (!stream) return;
  state.set('myAudio', stream);
  state.set('micAllowed', true);
  state.set('micMuted', false);
  return stream;
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
  if (state.myAudio) {
    state.myAudio.getTracks().forEach(track => track.stop());
  }
  state.set('myAudio', null);
}

state.on('micMuted', micMuted => {
  let {myAudio} = state;
  if (!myAudio?.active && !micMuted) {
    requestAudio();
    return;
  }
  if (myAudio) {
    for (let track of myAudio.getTracks()) {
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
  if (!state.audioContext) await next(state, 'audioContext');

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
