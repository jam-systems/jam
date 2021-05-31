import {is} from 'minimal-state';
import {domEvent} from '../../lib/util';
import {useUpdate, useRootState} from '../../lib/state-tree';

export default function AudioFile() {
  let audioState = 'initial'; // 'loading', 'playing'
  let activeFile = null;
  let audio = null;
  let stream = null;
  const update = useUpdate();
  const state = useRootState();

  async function createAudioFileStream(file, ctx) {
    let url = URL.createObjectURL(file);
    audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    // let stream = audio.captureStream(); // not supported in Safari & Firefox
    let streamDestination = ctx.createMediaStreamDestination();
    let source = ctx.createMediaElementSource(audio);
    source.connect(streamDestination);
    source.connect(ctx.destination);
    stream = streamDestination.stream;
    await audio.play();

    audioState = 'playing';

    update();

    domEvent(audio, 'ended').then(() => {
      if (activeFile === file) {
        closeAudioFileStream();
      }
    });
  }

  function closeAudioFileStream() {
    audioState = 'initial';
    if (audio) audio.removeAttribute('src');
    audio = null;
    stream = null;
    activeFile = null;
    is(state, 'audioFile', null);
  }

  return function AudioFile({audioFile, audioContext}) {
    let {file} = audioFile ?? {}; // {file, name, /* ... maybe other sources in the future */}
    let shouldPlay = file && audioContext;

    switch (audioState) {
      case 'initial':
        if (shouldPlay) {
          // TODO: createAudioFileStream takes long, show loading indicator somewhere
          audioState = 'loading';
          activeFile = file;
          createAudioFileStream(file, audioContext);
        }
        break;
      case 'loading':
        break;
      case 'playing':
        if (!shouldPlay) {
          audioState = 'initial';
          closeAudioFileStream();
        } else if (file !== activeFile) {
          audioState = 'loading';
          activeFile = file;
          createAudioFileStream(file, audioContext);
        }
        break;
    }
    return {audioFileStream: stream, audioFileElement: audio};
  };
}
