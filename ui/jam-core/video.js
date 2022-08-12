import {use, useRootState} from '../lib/state-tree';
import Camera from './video/Camera';

export {VideoState};

function VideoState() {
  return function VideoState({inRoom, iAmPresenter, remoteStreams}) {
    let shouldHaveCam = !!(inRoom && iAmPresenter);

    let result = use(Camera, {
      shouldHaveCam,
    });

    let {camStream, hasRequestedOnce, hasCamFailed} = result;

    const remoteVideoStreams = remoteStreams.filter(
      stream => (stream.name = 'video')
    );

    return {myVideo: camStream, hasCamFailed, remoteVideoStreams};
  };
}
