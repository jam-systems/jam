import state, {actions, swarm} from './state';
import {currentId} from './identity';
import {AudioState} from './audio';
import './reactions';
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

export {
  jamSetup,
  enterRoom,
  leaveRoom,
  leaveStage,
  dispatch as dispatchAppState,
};
export {addRole, removeRole} from './room';
export {addAdmin, removeAdmin, useIdentityAdminStatus} from './admin';

let {dispatch} = declareStateRoot(AppState, state, [
  'roomId',
  'userInteracted',
  'micMuted',
  'leftStage',
]);

function AppState() {
  let inRoom = null;
  let leftStage = false;

  return function AppState({roomId, userInteracted, micMuted}) {
    let myId = currentId();
    let {room, hasRoom, iAmSpeaker, iAmModerator} = use(RoomState, {
      roomId,
      myId,
    });
    let {closed, moderators} = room;

    // connect with signaling server
    declare(ConnectRoom, {roomId, shouldConnect: hasRoom});
    declare(ModeratorState, {moderators});

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

    userInteracted = userInteracted || !!inRoom;
    return merge(
      {userInteracted, inRoom, room, iAmSpeaker, iAmModerator, leftStage},
      declare(AudioState, {inRoom})
    );
  };
}

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

function jamSetup({staticConfig: config, cachedRooms}) {
  if (config) set(staticConfig, config);
  if (cachedRooms) {
    for (let roomId in cachedRooms) {
      populateCache(`/rooms/${roomId}`, cachedRooms[roomId]);
    }
  }
}
