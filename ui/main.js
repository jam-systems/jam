import swarm from './lib/swarm.js';
import State from './lib/minimal-state.js';

const state = State({
  soundMuted: true,
  myAudio: null,
});
window.state = state; // for debugging

window.enterJamRoom = () => {
  requestAudio();
  state.set('soundMuted', false);
};

window.leaveJamRoom = () => {
  stopAudio();
  state.set('soundMuted', true);
};

window.addEventListener('load', () => {
  let [, , secret] = location.pathname.split('/').filter(x => x);
  secret = secret || 'secret';
  console.log('secret', secret);
  state.secret = secret;
  swarm.config('https://signalhub.preview.realest8.at/', `jam-` + secret);
  swarm.connect();
});

state.on('myAudio', () => {
  swarm.addLocalStream(state.myAudio, 'audio');
});

let audios = {};
state.on('soundMuted', () => {
  let muted = state.soundMuted;
  for (let id in audios) {
    audios[id].muted = muted;
  }
});

swarm.on('stream', (stream, name, peer) => {
  console.log('remote stream', name, stream);
  let id = peer.peerId;
  if (!stream) {
    delete audios[id];
    return;
  }
  let audio = new Audio();
  audios[id] = audio;
  audio.srcObject = stream;
  audio.muted = true;
  audio.addEventListener('canplay', () => {
    audio.play();
  });
});

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
    });
  if (!stream) return;
  state.set('myAudio', stream);
  return stream;
}

async function stopAudio() {
  if (state.myAudio) {
    state.myAudio.getTracks().forEach(track => track.stop());
  }
  state.set('myAudio', undefined);
}
