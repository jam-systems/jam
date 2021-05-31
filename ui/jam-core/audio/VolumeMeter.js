import {on, update, clear, emit} from 'minimal-state';
import {useRootState, useUnmount} from '../../lib/state-tree';

export default function VolumeMeter() {
  const state = useRootState();
  let volumeMeter = null;
  let activeStream = null;
  useUnmount(() => {
    if (volumeMeter !== null) volumeMeter.stop();
  });

  return function VolumeMeter({stream, audioContext, peerId}) {
    if (stream && audioContext && stream !== activeStream) {
      activeStream = stream;
      if (volumeMeter !== null) volumeMeter.stop();

      volumeMeter = startVolumeMeter(stream, audioContext);
      on(volumeMeter, 'speaking', () => {
        state.speaking.add(peerId);
        update(state, 'speaking');
      });
      on(volumeMeter, 'stopped_speaking', () => {
        state.speaking.delete(peerId);
        update(state, 'speaking');
      });
    } else if (!stream && activeStream) {
      activeStream = null;
      volumeMeter.stop();
      volumeMeter = null;
    }
  };
}

const SMOOTHING = 0.1;
const INTERVAL = 50;
const THRESHOLD = -50;
const HISTORY_LENGTH = 10;

function startVolumeMeter(stream, audioContext) {
  if (!audioContext) return {};

  let analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = SMOOTHING;
  let fftBins = new Float32Array(analyser.frequencyBinCount);

  let sourceNode = audioContext.createMediaStreamSource(stream);
  sourceNode.connect(analyser);

  let speakingHistory = [];
  for (let i = 0; i < HISTORY_LENGTH; i++) {
    speakingHistory.push(0);
  }

  const volumeMeter = {
    running: true,
    speaking: false,
    threshold: THRESHOLD,
    stop() {
      volumeMeter.running = false;
      // emit(volumeMeter, 'volume_change', -100, volumeMeter.threshold);
      if (volumeMeter.speaking) {
        volumeMeter.speaking = false;
        emit(volumeMeter, 'stopped_speaking');
      }
      analyser.disconnect();
      sourceNode.disconnect();
      clear(volumeMeter);
    },
    speakingHistory,
    analyser,
    fftBins,
  };

  pollAnalyser(volumeMeter);
  return volumeMeter;
}

function pollAnalyser(volumeMeter) {
  setTimeout(() => {
    if (!volumeMeter.running) return;
    let {threshold, analyser, fftBins, speaking, speakingHistory} = volumeMeter;

    let currentVolume = getMaxVolume(analyser, fftBins);
    // emit(volumeMeter, 'volume_change', currentVolume, threshold);

    let historyCount = 0;
    if (currentVolume > threshold && !speaking) {
      // trigger quickly, short history
      for (
        let i = speakingHistory.length - 3;
        i < speakingHistory.length;
        i++
      ) {
        historyCount += speakingHistory[i];
      }
      if (historyCount >= 2) {
        volumeMeter.speaking = true;
        emit(volumeMeter, 'speaking');
      }
    } else if (currentVolume < threshold && speaking) {
      for (let i = 0; i < speakingHistory.length; i++) {
        historyCount += speakingHistory[i];
      }
      if (historyCount === 0) {
        volumeMeter.speaking = false;
        emit(volumeMeter, 'stopped_speaking');
      }
    }
    speakingHistory.shift();
    speakingHistory.push(0 + (currentVolume > threshold));

    pollAnalyser(volumeMeter);
  }, INTERVAL);
}

function getMaxVolume(analyser, fftBins) {
  var maxVolume = -Infinity;
  analyser.getFloatFrequencyData(fftBins);

  for (let i = 4, ii = fftBins.length; i < ii; i++) {
    if (fftBins[i] > maxVolume && fftBins[i] < 0) {
      maxVolume = fftBins[i];
    }
  }
  return maxVolume;
}
