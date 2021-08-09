import {useEffect} from 'react';
import {useJam} from './JamContext';

// unmute on space bar if currently muted
export function usePushToTalk() {
  const [state, {setProps}] = useJam();
  useEffect(() => {
    let keys = [' ', 'Spacebar'];
    let isPressingKey = false;
    let unmuteOnSpaceDown = event => {
      if (
        keys.includes(event.key) &&
        state.micMuted &&
        !event.repeat &&
        event.target?.tagName !== 'INPUT' &&
        event.target?.tagName !== 'TEXTAREA'
      ) {
        isPressingKey = true;
        event.stopPropagation();
        event.preventDefault();
        setProps('micMuted', false);
      }
    };
    let muteOnSpaceUp = event => {
      if (
        isPressingKey &&
        keys.includes(event.key) &&
        !state.micMuted &&
        event.target?.tagName !== 'INPUT' &&
        event.target?.tagName !== 'TEXTAREA'
      ) {
        isPressingKey = false;
        event.stopPropagation();
        event.preventDefault();
        setProps('micMuted', true);
      }
    };
    document.addEventListener('keydown', unmuteOnSpaceDown);
    document.addEventListener('keyup', muteOnSpaceUp);
    return () => {
      document.removeEventListener('keydown', unmuteOnSpaceDown);
      document.removeEventListener('keyup', muteOnSpaceUp);
    };
  }, [state, setProps]);
}

export function useCtrlCombos() {
  const [state, api] = useJam();
  useEffect(() => {
    let onKeyPress = event => {
      if (
        ctrlKeys.includes(event.key) &&
        event.ctrlKey &&
        event.altKey &&
        !event.repeat &&
        event.target?.tagName !== 'INPUT' &&
        event.target?.tagName !== 'TEXTAREA'
      ) {
        event.stopPropagation();
        event.preventDefault();
        handleCtrlCombo[event.key]?.(state, api);
      }
    };
    document.addEventListener('keydown', onKeyPress);
    return () => {
      document.removeEventListener('keydown', onKeyPress);
    };
  }, [state, api]);
}

const handleCtrlCombo = {
  r: async (
    {iAmModerator, isRecording},
    {startRecording, stopRecording, downloadRecording}
  ) => {
    if (!iAmModerator) return;
    if (isRecording) {
      stopRecording();
      downloadRecording('my-recording');
    } else {
      startRecording();
    }
  },
};
const ctrlKeys = Object.keys(handleCtrlCombo);
