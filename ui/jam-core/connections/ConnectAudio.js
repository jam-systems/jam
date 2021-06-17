import {use, useRootState} from '../../lib/state-tree';
import {useStableArray} from '../../lib/state-diff';
import Mediasoup from './Mediasoup';
import P2pAudio from './P2pAudio';

export default function ConnectAudio({
  swarm,
  hasMediasoup,
  roomId,
  iAmSpeaker,
}) {
  let localStream = useRootState('myAudio');

  // send & receive audio via SFU / mediasoup
  let serverRemoteStreams = use(Mediasoup, {
    swarm,
    roomId,
    shouldSend: hasMediasoup && iAmSpeaker,
    shouldReceive: hasMediasoup && !iAmSpeaker,
    localStream,
  });

  // send & receive audio via p2p webRTC
  let p2pRemoteStreams = use(P2pAudio, {
    swarm,
    shouldSend: iAmSpeaker,
    localStream,
  });
  // for now, to simulate no p2p stream arriving at audience
  if (!iAmSpeaker && hasMediasoup) p2pRemoteStreams = [];

  // merge remote streams from both sources
  let remoteStreams = useStableArray([
    ...p2pRemoteStreams,
    ...serverRemoteStreams.filter(
      ({peerId}) => !p2pRemoteStreams.find(x => x.peerId === peerId)
    ),
  ]);
  return remoteStreams;
}
