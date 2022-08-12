import {declare, use, useRootState} from '../../lib/state-tree';
import {useStableArray} from '../../lib/state-diff';
import Mediasoup from './Mediasoup';
import P2pMedia from './P2pMedia.js';
import WebRtcConnections from './WebRtcConnections';

export default function ConnectMedia({roomState, swarm, hasMediasoup}) {
  let {roomId, iAmSpeaker, iAmPresenter} = roomState;
  let localAudioStream = useRootState('myAudio');
  let localVideoStream = useRootState('myVideo');

  // send & receive audio via SFU / mediasoup
  let serverRemoteStreams = use(Mediasoup, {
    swarm,
    roomId,
    shouldSendAudio: hasMediasoup && iAmSpeaker,
    shouldSendVideo: hasMediasoup && iAmPresenter,
    shouldReceive: hasMediasoup && !iAmSpeaker,
    localAudioStream,
    localVideoStream,
  });

  // connect to subset of peers directly via webRTC
  declare(WebRtcConnections, {roomState, swarm, hasMediasoup});

  // send & receive audio via p2p webRTC
  let p2pRemoteStreams = use(P2pMedia, {
    swarm,
    iAmSpeaker,
    iAmPresenter,
    localAudioStream,
    localVideoStream,
  });

  // merge remote streams from both sources
  let remoteStreams = useStableArray([
    ...p2pRemoteStreams,
    ...serverRemoteStreams.filter(
      ({peerId}) => !p2pRemoteStreams.find(x => x.peerId === peerId)
    ),
  ]);
  return remoteStreams;
}
