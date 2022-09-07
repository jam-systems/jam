import {is} from 'minimal-state';
import {actions} from '../state';
import {userAgent} from '../../lib/user-agent';
import {useUpdate, useAction, useUnmount} from '../../lib/state-tree';
import {StoredState} from '../../lib/local-storage.js';

export default function Microphone() {
  const selectedMicrophoneState = StoredState('jam.selectedMicrophone');
  let availableMicrophones = [];
  let micState = 'initial'; // 'requesting', 'active', 'failed'
  let micStream = null;
  let hasRequestedOnce = false;
  const update = useUpdate();

  useUnmount(() => {
    micStream?.getTracks().forEach(track => track.stop());
  });

  async function requestMic() {
    try {
      const constraints = !!selectedMicrophoneState.deviceId
        ? {
            audio: {
              deviceId: {
                exact: selectedMicrophoneState.deviceId,
              },
            },
          }
        : {
            video: false,
            audio: true,
          };
      let stream = await navigator.mediaDevices.getUserMedia(constraints);
      availableMicrophones = (
        await navigator.mediaDevices.enumerateDevices()
      ).filter(d => d.kind === 'audioinput');
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

  return function Microphone({shouldHaveMic = true}) {
    let [isRetry] = useAction(actions.RETRY_MIC);
    let [isSelectMicrophone, selectedMicrophone] = useAction(
      actions.SELECT_MIC
    );

    if (isSelectMicrophone) {
      is(selectedMicrophoneState, 'deviceId', selectedMicrophone.deviceId);
    }

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
        } else if (isSelectMicrophone) {
          micStream.getTracks().forEach(track => track.stop());
          micStream = null;
          micState = 'requesting';
          requestMic();
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

    return {
      micStream,
      hasRequestedOnce,
      hasMicFailed: micState === 'failed',
      availableMicrophones,
    };
  };
}
