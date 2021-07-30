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
    autoJoin,
    autoRejoin,
    customStream,
  }) {
    let {myId, myIdentity} = use(Identity, {roomId});

    let {room, hasRoom, iAmSpeaker, iAmModerator} = use(RoomState, {
      roomId,
      myId,
      myIdentity,
      peerState,
      myPeerState,
    });
    let {closed, moderators, speakers} = room;
    let inRoom = use(InRoom, {
      roomId,
      autoJoin,
      autoRejoin,
      iAmModerator,
      hasRoom,
      closed,
    });

    // connect with signaling server
    declare(ConnectRoom, {
      swarm,
      myId,
      myIdentity,
      roomId,
      shouldConnect: hasRoom,
    });
    declare(ModeratorState, {swarm, moderators});

    let remoteStreams = use(ConnectAudio, {
      hasMediasoup,
      swarm,
      roomId,
      iAmSpeaker,
      speakers,
    });

    is(myPeerState, {micMuted, inRoom: !!inRoom});
    declare(Reactions, {swarm});

    return merge(
      {
        swarm,
        roomId,
        micMuted,
        inRoom,
        room,
        iAmSpeaker,
        iAmModerator,
        myId,
        myIdentity,
      },
      declare(AudioState, {
        myId,
        inRoom,
        iAmSpeaker,
        swarm,
        remoteStreams,
        userInteracted,
        micMuted,
        customStream,
      })
    );
  };
}

function InRoom() {
  let inRoom = null;
  let autoJoinCount = 0;
  let didAutoJoin = false;
  const joinedRooms = StoredState('jam.joinedRooms', () => ({}));

  return function InRoom({
    roomId,
    autoJoin,
    autoRejoin,
    iAmModerator,
    hasRoom,
    closed,
  }) {
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
