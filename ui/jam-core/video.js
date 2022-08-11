import {use} from '../lib/state-tree';
import Camera from './video/Camera';

export {VideoState};

function VideoState({swarm}) {
  return function VideoState({inRoom, iAmPresenter}) {
    let shouldHaveCamera = !!(inRoom && iAmPresenter);

    console.log(
      'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      shouldHaveCamera,
      'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    );

    let {cameraStream, hasRequestedOnce, hasCamFailed} = use(Camera, {
      shouldHaveCamera,
    });

    return {myVideo: cameraStream, hasCamFailed};
  };
}
