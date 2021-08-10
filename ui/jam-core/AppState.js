import {is} from 'minimal-state';
import {declare, merge, use, useAction} from '../lib/state-tree';
import Swarm from '../lib/swarm';
import {StoredState} from '../lib/local-storage';

import {Identity} from './identity';
import {actions} from './state';
import {AudioState} from './audio';
import {Reactions} from './reactions';
import {RoomState} from './room';
import ModeratorState from './room/ModeratorState';
import ConnectAudio from './connections/ConnectAudio';
import ConnectRoom from './connections/ConnectRoom';
import {useStableArray, useStableObject} from '../lib/state-diff';

export default function AppState({hasMediasoup}) {
  const swarm = Swarm();
  const {peerState, myPeerState} = swarm;
  is(myPeerState, {
    inRoom: false,
    micMuted: false,
    leftStage: false,
    isRecording: false,
  });

  return function AppState({
    roomId,
    userInteracted,
    micMuted,
    handRaised,
    autoJoin,
    autoRejoin,
    customStream,
  }) {
    let myIdentity = use(Identity, {roomId});
    let myId = myIdentity.publicKey;

    // {roomId, room, hasRoom, isRoomLoading, iAmSpeaker, iAmModerator} = roomState
    let roomState = use(RoomState, {
      roomId,
      myIdentity,
      peerState,
      myPeerState,
    });
    let {room, iAmSpeaker} = roomState;
    let inRoom = use(InRoom, {roomState, autoJoin, autoRejoin});

    // connect with signaling server
    declare(ConnectRoom, {roomState, swarm, myIdentity});
    declare(ModeratorState, {swarm, moderators: room.moderators, handRaised});

    let remoteStreams = use(ConnectAudio, {roomState, hasMediasoup, swarm});

    is(myPeerState, {micMuted, inRoom: !!inRoom});
    declare(Reactions, {swarm});

    return merge(
      {swarm, micMuted, handRaised, inRoom, myId, myIdentity},
      roomState,
      declare(PeerState, {swarm}),
      declare(AudioState, {
        myId,
        inRoom,
        iAmSpeaker,
        swarm,
        remoteStreams,
        userInteracted,
        micMuted,
        handRaised,
        customStream,
      })
    );
  };
}

function PeerState({swarm}) {
  let peers = useStableArray(Object.keys(use(swarm, 'peers') ?? {}));
  let peerState = useStableObject({...use(swarm, 'peerState')});
  let myPeerState = useStableObject({...use(swarm, 'myPeerState')});
  return {peers, peerState, myPeerState};
}

function InRoom() {
  let inRoom = null;
  let autoJoinCount = 0;
  let didAutoJoin = false;
  const joinedRooms = StoredState('jam.joinedRooms', () => ({}));

  return function InRoom({roomState, autoJoin, autoRejoin}) {
    let {
      roomId,
      hasRoom,
      room: {closed},
      iAmModerator,
    } = roomState;

    let [isJoinRoom, joinedRoomId] = useAction(actions.JOIN);
    let [isAutoJoin] = useAction(actions.AUTO_JOIN);
    if ((isAutoJoin || (autoJoin && !didAutoJoin)) && autoJoinCount === 0) {
      didAutoJoin = true;
      autoJoinCount = 1;
    }

    if (!roomId || (closed && !iAmModerator)) {
      inRoom = null;
    } else {
      if (isJoinRoom) {
        inRoom = joinedRoomId; // can be null, for leaving room
      } else if (autoRejoin && hasRoom && joinedRooms[roomId]) {
        inRoom = roomId;
      }
      if (autoJoinCount > 0 && hasRoom) {
        autoJoinCount--;
        inRoom = roomId;
      }
    }

    if (autoRejoin) is(joinedRooms, roomId, inRoom !== null || undefined);
    return inRoom;
  };
}
