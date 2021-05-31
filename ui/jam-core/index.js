import {defaultState, actions} from './state';
import {Identity} from './identity';
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
// TODOs: reduce API, split out React-dependent stuff (hooks)
export {
  jamState,
  jamSetup,
  enterRoom,
  leaveRoom,
  leaveStage,
  sendReaction,
  retryMic,
};
export {addRole, removeRole} from './room';
export {addAdmin, removeAdmin} from './admin';
export {updateInfo, importRoomIdentity} from './identity';
export {createRoom, updateRoom} from './backend';
export {default as GetRequest} from './GetRequest';

// TODO: this should be exposed as a function rather than happen at the top level
const {state: jamState, dispatch} = declareStateRoot(
  AppState,
  {...defaultState},
  ['roomId', 'userInteracted', 'micMuted']
);

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
    declare(ConnectRoom, {swarm, myId, roomId, shouldConnect: hasRoom});
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

// TODO: these shouldn't have global access to `dispatch`
// could have a function that returns the Jam API, e.g.
// 1.) () => [state, {enterRoom, leaveRoom, ...}]
// 2.) () => [state, dispatch] and only state/dispatch are used to call into Jam
// I prefer 1., and to err on the side of passing around `state` to achieve most things (via set(state, ...), dispatch(state, ...))
function enterRoom(roomId) {
  dispatch(actions.JOIN, roomId);
  // is(state, {roomId, inRoom: roomId});
}

function leaveRoom() {
  dispatch(actions.JOIN, null);
  // is(state, 'inRoom', null);
}

function leaveStage() {
  dispatch(actions.LEAVE_STAGE);
}

function sendReaction(reaction) {
  dispatch(actions.REACTION, reaction);
}

function retryMic() {
  dispatch(actions.RETRY_MIC);
}

function jamSetup({jamConfig, cachedRooms}) {
  if (jamConfig) set(staticConfig, jamConfig);
  if (cachedRooms) {
    for (let roomId in cachedRooms) {
      populateCache(`/rooms/${roomId}`, cachedRooms[roomId]);
    }
  }
}
