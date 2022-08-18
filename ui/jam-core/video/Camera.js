import {actions} from '../state';
import {userAgent} from '../../lib/user-agent';
import {useUpdate, useAction, useUnmount} from '../../lib/state-tree';

export default function Camera() {
  let camState = 'initial'; // 'requesting', 'active', 'failed'
  let camStream = null;
  let hasRequestedOnce = false;
  let rejectedCameraIds = new Set();
  const update = useUpdate();

  useUnmount(() => {
    camStream?.getTracks().forEach(track => track.stop());
  });

  async function requestCam() {
    try {
      let stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      hasRequestedOnce = true;
      if (camState !== 'requesting') return;
      camState = 'active';
      camStream = stream;
    } catch (err) {
      if (camState !== 'requesting') return;
      console.error('error getting cam', err);
      camState = 'failed';
      camStream = null;
    }
    update();
  }

  function forceRetryCam() {
    // most reliable retry is reloading, but only Safari asks for Mic again
    if (userAgent.browser?.name === 'Safari') {
      location.reload();
    } else {
      camState = 'requesting';
      requestCam();
    }
  }

  async function switchCamera() {
    try {
      const availableCameraIds = (
        await navigator.mediaDevices.enumerateDevices()
      )
        .filter(d => d.kind === 'videoinput')
        .map(d => d.deviceId);
      const currentCameraId = camStream.getVideoTracks()[0].getSettings()
        .deviceId;
      rejectedCameraIds.add(currentCameraId);

      let newCameraId = availableCameraIds.find(
        id => !rejectedCameraIds.has(id)
      );

      if (newCameraId === undefined) {
        rejectedCameraIds.clear();
        newCameraId = availableCameraIds[0];
      }
      camState = 'active';
      camStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: {
            exact: newCameraId,
          },
        },
      });
    } catch (err) {
      if (camState !== 'requesting') return;
      console.error('error getting cam', err);
      camState = 'failed';
      camStream = null;
    }
    update();
  }

  // TODO poll/listen to micStream.active state, switch to failed if not active but should

  return function Camera({shouldHaveCam = true}) {
    let [isRetry] = useAction(actions.RETRY_CAM);
    let [isSwitchCam] = useAction(actions.SWITCH_CAM);

    switch (camState) {
      case 'initial':
        if (shouldHaveCam) {
          camState = 'requesting';
          requestCam();
        }
        break;
      case 'requesting':
        if (!shouldHaveCam) {
          camState = 'initial';
        }
        break;
      case 'active':
        if (!shouldHaveCam) {
          camStream.getTracks().forEach(track => track.stop());
          camStream = null;
          camState = 'initial';
        } else if (isRetry && !camStream.active) {
          forceRetryCam();
        } else if (isSwitchCam) {
          camState = 'requesting';
          switchCamera();
        }
        break;
      case 'failed':
        if (!shouldHaveCam) {
          camState = 'initial';
        } else if (isRetry) {
          forceRetryCam();
        }
        break;
    }

    return {camStream, hasRequestedOnce, hasCamFailed: camState === 'failed'};
  };
}
