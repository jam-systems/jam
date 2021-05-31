import hark from '../../lib/hark';
import {on, update} from 'use-minimal-state';
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

      volumeMeter = hark(stream, {audioContext});
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
