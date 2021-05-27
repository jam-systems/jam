import state, {actions, swarm} from './state';
import {get} from './backend';
import {currentId} from './identity';
import {AudioState} from './audio';
import './reactions';
import {RoomState} from './room';
import {is, on, update} from 'use-minimal-state';
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

if (window.existingRoomInfo) {
  populateCache(`/rooms/${window.existingRoomId}`, window.existingRoomInfo);
}

let {dispatch} = declareStateRoot(AppState, state, [
  'roomId',
  'userInteracted',
  'micMuted',
  'leftStage',
]);
export {enterRoom, leaveRoom, leaveStage, dispatch as dispatchAppState};

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

// leave room when same peer joins it from elsewhere and I'm in room
// TODO: currentId() is called too early to react to any changes!
on(swarm.connectionState, currentId(), myConnState => {
  if (myConnState === undefined) {
    is(state, {otherDeviceInRoom: false});
    return;
  }
  let {states, latest} = myConnState;
  let {myConnId} = swarm;
  let otherDeviceInRoom = false;
  for (let connId in states) {
    if (connId !== myConnId && states[connId].state.inRoom) {
      otherDeviceInRoom = true;
      if (connId === latest && state.inRoom) leaveRoom();
      break;
    }
  }
  is(state, {otherDeviceInRoom});
});

on(swarm, 'newPeer', async id => {
  for (let i = 0; i < 5; i++) {
    // try multiple times to lose race with the first POST /identities
    let [data, ok] = await get(`/identities/${id}`);
    if (ok) {
      state.identities[id] = data;
      update(state, 'identities');
      return;
    }
  }
});
