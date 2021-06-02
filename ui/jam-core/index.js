import {Identity, updateInfo} from './identity';
import {defaultState, actions} from './state';
import {AudioState} from './audio';
import {Reactions} from './reactions';
import {
  RoomState,
  addSpeaker,
  addModerator,
  removeSpeaker,
  removeModerator,
} from './room';
import {is, set, on, update} from 'minimal-state';
import {
  declare,
  declareStateRoot,
  merge,
  use,
  useAction,
} from '../lib/state-tree';
import {ConnectRoom} from './connect';
import ModeratorState from './room/ModeratorState';
import {useDidChange} from '../lib/state-utils';
import {staticConfig} from './config';
import Swarm from '../lib/swarm';
import {populateApiCache, createRoom, updateRoom} from './backend';
import {addAdmin, removeAdmin} from './admin';

/* THE JAM API */
// TODO: it would be nice to be able to await some of these actions
// with the promise resolving as soon as state-tree ran with the updated params
// because otherwise it is hard to handle some of our API functions that assume existing state
// e.g. setState('roomId', ...) -> wait until next tick when state.roomId has updated -> addSpeaker(peerId)
// not waiting would potentially add a speaker to a different room

export {createJam};
export {importRoomIdentity} from './identity';
export {is, set, on, update};

function createApi(state, dispatch) {
  return {
    setState(...args) {
      is(state, ...args);
    },
    onState(...args) {
      return on(state, ...args);
    },
    // create room with the own identity as the only moderator and speaker
    createRoom: (roomId, partialRoom) => createRoom(state, roomId, partialRoom),

    // completely replaces the room, rejects if moderator/speaker array is not set
    // only possible for moderators
    updateRoom: (roomId, room) => updateRoom(state, roomId, room),

    addSpeaker: (roomId, peerId) => addSpeaker(state, roomId, peerId),
    addModerator: (roomId, peerId) => addModerator(state, roomId, peerId),
    removeSpeaker: (roomId, peerId) => removeSpeaker(state, roomId, peerId),
    removeModerator: (roomId, peerId) => removeModerator(state, roomId, peerId),
    addAdmin: peerId => addAdmin(state, peerId),
    removeAdmin: peerId => removeAdmin(state, peerId),

    updateInfo: info => updateInfo(state, info),

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
}

function createJam({jamConfig, cachedRooms} = {}) {
  // setup stuff
  if (jamConfig) set(staticConfig, jamConfig);
  if (cachedRooms) {
    for (let roomId in cachedRooms) {
      populateApiCache(`/rooms/${roomId}`, cachedRooms[roomId]);
    }
  }

  const {state, dispatch} = declareStateRoot(AppState, {...defaultState}, [
    'roomId',
    'userInteracted',
    'micMuted',
  ]);
  const api = createApi(state, dispatch);

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
