import {clear, emit} from 'use-minimal-state';
const AudioContext = window.AudioContext || window.webkitAudioContext;

export default function (stream, options_) {
  // make it not break in non-supported browsers
  if (!AudioContext) return {};

  //Config
  let options = options_ || {},
    smoothing = options.smoothing || 0.1,
    interval = options.interval || 50,
    threshold = options.threshold,
    history = options.history || 10,
    running = true;

  let audioContext = options.audioContext;
  let sourceNode, fftBins, analyser;

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = smoothing;
  fftBins = new Float32Array(analyser.frequencyBinCount);

  sourceNode = audioContext.createMediaStreamSource(stream);
  threshold = threshold || -50;
  sourceNode.connect(analyser);

  const harker = {
    speaking: false,
    setThreshold(t) {
      threshold = t;
    },
    setInterval(i) {
      interval = i;
    },
    stop() {
      running = false;
      emit(harker, 'volume_change', -100, threshold);
      if (harker.speaking) {
        harker.speaking = false;
        emit(harker, 'stopped_speaking');
      }
      analyser.disconnect();
      sourceNode.disconnect();
      clear(harker);
    },
    speakingHistory: [],
  };

  for (let i = 0; i < history; i++) {
    harker.speakingHistory.push(0);
  }

  // Poll the analyser node to determine if speaking
  // and emit events if changed
  let looper = function () {
    setTimeout(() => {
      //check if stop has been called
      if (!running) {
        return;
      }

      let currentVolume = getMaxVolume(analyser, fftBins);

      emit(harker, 'volume_change', currentVolume, threshold);

      var history = 0;
      if (currentVolume > threshold && !harker.speaking) {
        // trigger quickly, short history
        for (
          let i = harker.speakingHistory.length - 3;
          i < harker.speakingHistory.length;
          i++
        ) {
          history += harker.speakingHistory[i];
        }
        if (history >= 2) {
          harker.speaking = true;
          emit(harker, 'speaking');
        }
      } else if (currentVolume < threshold && harker.speaking) {
        for (let i = 0; i < harker.speakingHistory.length; i++) {
          history += harker.speakingHistory[i];
        }
        if (history == 0) {
          harker.speaking = false;
          emit(harker, 'stopped_speaking');
        }
      }
      harker.speakingHistory.shift();
      harker.speakingHistory.push(0 + (currentVolume > threshold));

      looper();
    }, interval);
  };
  looper();

  return harker;
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
