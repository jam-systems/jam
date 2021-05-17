import {addLocalStream} from '../lib/swarm';
import hark from '../lib/hark';
import UAParser from 'ua-parser-js';
import state, {actions, swarm} from './state';
import {on, set, update} from 'use-minimal-state';
import {currentId} from './identity';
import log from '../lib/causal-log';
import {domEvent} from './util';
import {openModal} from '../views/Modal';
import InteractionModal from '../views/InteractionModal';
import AudioPlayerToast from '../views/AudioPlayerToast';
import {until} from '../lib/state-utils';
import {
  useUpdate,
  useAction,
  useState,
  declare,
  use,
  useRootState,
} from '../lib/state-tree';

var userAgent = UAParser();

export {AudioState};

function AudioState() {
  let [
    inRoom,
    iAmSpeaker,
    raisedHands,
    audioContext,
    micMuted,
    audioFile,
  ] = useRootState([
    'inRoom',
    'iAmSpeaker',
    'raisedHands',
    'audioContext',
    'micMuted',
    'audioFile',
  ]);

  let myHandRaised = raisedHands.has(currentId());
  let shouldHaveMic = !!(inRoom && (iAmSpeaker || myHandRaised));
  let {micStream, hasRequestedOnce} = use(Microphone, {shouldHaveMic});

  let {audioFileStream} = use(AudioFileStream, {audioFile, audioContext});

  let myAudio = audioFileStream ?? micStream;
  declare(Muted, {myAudio, micMuted});
  declare(ConnectMyAudio, {myAudio, iAmSpeaker});
  let soundMuted = inRoom ? iAmSpeaker && !hasRequestedOnce : true;

  return {myAudio, soundMuted};
}

function Microphone() {
  let micState = 'initial'; // 'requesting', 'active', 'failed'
  let micStream = null;
  let hasRequestedOnce = false;
  const update = useUpdate();

  async function requestMic() {
    try {
      let stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      hasRequestedOnce = true;
      if (micState !== 'requesting') return;
      micState = 'active';
      micStream = stream;
    } catch (err) {
      if (micState !== 'requesting') return;
      console.error('error getting mic', err);
      micState = 'failed';
      micStream = null;
    }
    update();
  }

  function forceRetryMic() {
    // most reliable retry is reloading, but only Safari asks for Mic again
    if (userAgent.browser?.name === 'Safari') {
      location.reload();
    } else {
      micState = 'requesting';
      requestMic();
    }
  }

  // TODO poll/listen to micStream.active state, switch to failed if not active but should

  return function Microphone({shouldHaveMic}) {
    let [isRetry] = useAction(actions.RETRY_MIC);

    switch (micState) {
      case 'initial':
        if (shouldHaveMic) {
          micState = 'requesting';
          requestMic();
        }
        break;
      case 'requesting':
        if (!shouldHaveMic) {
          micState = 'initial';
        }
        break;
      case 'active':
        if (!shouldHaveMic) {
          micStream.getTracks().forEach(track => track.stop());
          micStream = null;
          micState = 'initial';
        } else if (isRetry && !micStream.active) {
          forceRetryMic();
        }
        break;
      case 'failed':
        if (!shouldHaveMic) {
          micState = 'initial';
        } else if (isRetry) {
          forceRetryMic();
        }
        break;
    }

    return {micStream, hasRequestedOnce};
  };
}

function AudioFileStream({audioFile, audioContext: ctx}) {
  let {file} = audioFile ?? {};
  let [audioState, setState] = useState('initial'); // 'starting', 'active'
  let useActiveFile = useState(null);
  let [activeFile, setActiveFile] = useActiveFile;
  let [audioFileStream, setStream] = useState(null);
  let [audio, setAudio] = useState(null);
  const state = useRootState();
  const update = useUpdate();
  let shouldStream = file && ctx;

  switch (audioState) {
    case 'initial':
      if (shouldStream) {
        // TODO: createObjectURL takes long, show loading indicator somewhere
        setState('starting');
        (async () => {
          let url = URL.createObjectURL(file);
          audio = setAudio(new Audio(url));
          audio.crossOrigin = 'anonymous';
          // let stream = audio.captureStream(); // not supported in Safari & Firefox
          let streamDestination = ctx.createMediaStreamDestination();
          let source = ctx.createMediaElementSource(audio);
          source.connect(streamDestination);
          source.connect(ctx.destination);
          audioFileStream = setStream(streamDestination.stream);
          await audio.play();

          setState('active');
          setActiveFile(file);
          set(state, 'audioFile', {...audioFile, audio});

          openModal(AudioPlayerToast, {}, 'player');

          domEvent(audio, 'ended').then(() => {
            if (useActiveFile[0] !== file) return;
            audio.src = null;
            setAudio(null);
            setStream(null);
            setActiveFile(null);
            setState('initial');
            set(state, 'audioFile', null);
          });
        })();
      }
      break;
    case 'starting':
      break;
    case 'active':
      if (!shouldStream || file !== activeFile) {
        audio.src = null;
        setAudio(null);
        audioFileStream = setStream(null);
        setActiveFile(null);
        setState('initial');
        if (file !== activeFile) update();
      }
      break;
  }
  return {audioFileStream};
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

function ConnectMyAudio({myAudio, iAmSpeaker}) {
  let [connected, setConnected] = useState(null);
  let shouldConnect = myAudio && iAmSpeaker;

  if (connected !== myAudio && shouldConnect) {
    connectVolumeMeter(currentId(), myAudio);
    addLocalStream(swarm, myAudio, 'audio');
    setConnected(myAudio);
  } else if (connected && !shouldConnect) {
    disconnectVolumeMeter(currentId());
    addLocalStream(swarm, null, 'audio');
    setConnected(null);
  }
}

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
