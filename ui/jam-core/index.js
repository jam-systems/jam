import {Identity} from './identity';
import {defaultState, actions} from './state';
import {AudioState} from './audio';
import {Reactions} from './reactions';
import {RoomState} from './room';
import {is, set} from 'use-minimal-state';
import {
  declare,
  declareStateRoot,
  merge,
  use,
  useAction,
} from '../lib/state-tree';
import {populateCache} from './GetRequest';
import {ConnectRoom} from './connect';
import ModeratorState from './room/ModeratorState';
import {useDidChange} from '../lib/state-utils';
import {staticConfig} from './config';
import Swarm from '../lib/swarm';

/* THE JAM API */
export {createJamState, jamSetup};
export {addRole, removeRole} from './room';
export {addAdmin, removeAdmin} from './admin';
export {updateInfo, importRoomIdentity} from './identity';
export {createRoom, updateRoom} from './backend';
export {default as GetRequest} from './GetRequest';

function createJamState() {
  const {state, dispatch} = declareStateRoot(AppState, {...defaultState}, [
    'roomId',
    'userInteracted',
    'micMuted',
  ]);

  const api = {
    setState(...args) {
      is(state, ...args);
    },
    enterRoom(roomId) {
      dispatch(actions.JOIN, roomId);
    },
    leaveRoom() {
      dispatch(actions.JOIN, null);
    },
    leaveStage() {
      dispatch(actions.LEAVE_STAGE);
    },
    sendReaction(reaction) {
      dispatch(actions.REACTION, reaction);
    },
    retryMic() {
      dispatch(actions.RETRY_MIC);
    },
  };

  return [state, api];
}

// FIXME: there is no user interaction before playing audio in /s rooms
// also, the code below has the wrong assumption that being in a room implies a previous user interaction
// => audio context fails to start, no speaking rings or sound

function AppState() {
  let inRoom = null;
  let leftStage = false;
  const swarm = Swarm();

  return function AppState({roomId, userInteracted, micMuted}) {
    let {myId, myIdentity} = use(Identity, {roomId});

    let {room, hasRoom, iAmSpeaker, iAmModerator} = use(RoomState, {
      swarm,
      roomId,
      myId,
    });
    let {closed, moderators} = room;

    // connect with signaling server
    declare(ConnectRoom, {
      swarm,
      myId,
      myIdentity,
      roomId,
      shouldConnect: hasRoom,
    });
    declare(ModeratorState, {swarm, moderators});

    let [isJoinRoom, joinedRoomId] = useAction(actions.JOIN);
    if (!roomId || (closed && !iAmModerator)) {
      inRoom = null;
    } else if (isJoinRoom) {
      inRoom = joinedRoomId;
    }

    let [isLeaveStage] = useAction(actions.LEAVE_STAGE);
    let iBecameSpeaker = useDidChange(iAmSpeaker) && iAmSpeaker;
    if (iBecameSpeaker) {
      leftStage = false;
    }
    if (isLeaveStage && iAmSpeaker) {
      leftStage = true;
    }

    is(swarm.myPeerState, {
      micMuted,
      inRoom: !!inRoom,
      leftStage,
    });

    declare(Reactions, {swarm});

    userInteracted = userInteracted || !!inRoom;
    return merge(
      {
        swarm,
        userInteracted,
        inRoom,
        room,
        iAmSpeaker,
        iAmModerator,
        leftStage,
        myId,
        myIdentity,
      },
      declare(AudioState, {myId, inRoom, iAmSpeaker, swarm, userInteracted})
    );
  };
}

function jamSetup({jamConfig, cachedRooms}) {
  if (jamConfig) set(staticConfig, jamConfig);
  if (cachedRooms) {
    for (let roomId in cachedRooms) {
      populateCache(`/rooms/${roomId}`, cachedRooms[roomId]);
    }
  }
}
