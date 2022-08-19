import {actions} from '../state';
import {userAgent} from '../../lib/user-agent';
import {useUpdate, useAction, useUnmount} from '../../lib/state-tree';

export default function Camera() {
  let camState = 'initial'; // 'requesting', 'active', 'failed'
  let camStream = null;
  let hasRequestedOnce = false;
  let usedCameraIds = new Set();
  const update = useUpdate();

  useUnmount(() => {
    camStream?.getTracks().forEach(track => track.stop());
  });

  async function requestCam() {
    try {
      const availableCameraIds = (
        await navigator.mediaDevices.enumerateDevices()
      )
        .filter(d => d.kind === 'videoinput')
        .map(d => d.deviceId);

      if (availableCameraIds.length === 0) {
        console.log('no cameras available');
        camState = 'failed';
        camStream = null;
        return;
      }

      let newCameraId = availableCameraIds[0];
      usedCameraIds.add(newCameraId);

      camStream?.getTracks().forEach(track => track.stop());
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

  function forceRetryCam() {
    // most reliable retry is reloading, but only Safari asks for Mic again
    if (userAgent.browser?.name === 'Safari') {
      location.reload();
    } else {
      camState = 'requesting';
      switchCamera();
    }
  }

  async function switchCamera() {
    try {
      const availableCameraIds = (
        await navigator.mediaDevices.enumerateDevices()
      )
        .filter(d => d.kind === 'videoinput')
        .map(d => d.deviceId);

      if (availableCameraIds.length === 0) {
        console.log('no cameras available');
        camState = 'failed';
        camStream = null;
        return;
      }

      let newCameraId = availableCameraIds.find(id => !usedCameraIds.has(id));

      if (newCameraId === undefined) {
        usedCameraIds.clear();
        newCameraId = availableCameraIds[0];
      }

      usedCameraIds.add(newCameraId);

      camStream?.getTracks().forEach(track => track.stop());

      camState = 'active';
      camStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: {
            exact: newCameraId,
          },
        },
      });
    } catch (err) {
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
        } else if (isSwitchCam) {
          camState = 'requesting';
          switchCamera();
        }
        break;
    }

    return {camStream, hasRequestedOnce, hasCamFailed: camState === 'failed'};
  };
}
