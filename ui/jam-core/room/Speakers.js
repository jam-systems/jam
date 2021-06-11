import {is} from 'minimal-state';
import {useEvent, useAction} from '../../lib/state-tree';
import {useStableArray} from '../../lib/state-diff';
import {StoredState} from '../../lib/local-storage';
import {useDidChange} from '../../lib/state-utils';
import {getCache} from '../../lib/GetRequest';
import {actions} from '../state';
import {put, apiUrl} from '../backend';

export {addSpeaker, removeSpeaker};

export default function Speakers() {
  const leftStageRooms = StoredState('jam.leftStageRooms', () => ({}));
  const leftStageMap = new Map(); // roomId => Set(peerId)

  return function Speakers({
    roomId,
    hasRoom,
    room,
    peerState,
    myPeerState,
    myIdentity,
    myId,
  }) {
    let leftStagePeers =
      leftStageMap.get(roomId) ??
      leftStageMap.set(roomId, new Set()).get(roomId);

    let {speakers, stageOnly} = room;

    // did I leave stage? (from localStorage / gets overridden when we are put back on stage while in the room)
    let [isLeaveStage] = useAction(actions.LEAVE_STAGE);
    let justGotRoom = useDidChange(hasRoom) && hasRoom;
    let iAmServerSpeaker = !!stageOnly || speakers.includes(myId);
    let iBecameSpeaker =
      useDidChange(iAmServerSpeaker) && iAmServerSpeaker && !justGotRoom;
    if (iBecameSpeaker) {
      is(leftStageRooms, roomId, undefined);
      leftStagePeers.delete(myId);
    }
    if (isLeaveStage) {
      is(leftStageRooms, roomId, true);
      leftStagePeers.add(myId);
    }
    let leftStage = !!leftStageRooms[roomId];
    is(myPeerState, {leftStage}); // announce to peers

    // who else did leave stage? (announced by others via p2p state)
    let [isLeftStage, peerId, state] = useEvent(
      peerState,
      (peerId, state) => state?.leftStage === !leftStagePeers.has(peerId)
    );
    if (isLeftStage) {
      if (state.leftStage) {
        leftStagePeers.add(peerId);
        // if I'm moderator and someone else left stage, I remove him from speakers
        let iAmModerator = room.moderators.includes(myId);
        if (iAmModerator && room.speakers.includes(peerId)) {
          removeSpeaker({myIdentity}, roomId, peerId);
        }
      } else {
        leftStagePeers.delete(peerId);
      }
    }
    speakers = useStableArray(speakers.filter(s => !leftStagePeers.has(s)));
    return speakers;
  };
}

function getCachedRoom(roomId) {
  if (!roomId) return null;
  return getCache(`${apiUrl()}/rooms/${roomId}`).data;
}

async function addSpeaker(state, roomId, peerId) {
  let room = getCachedRoom(roomId);
  if (room === null) return false;
  let {speakers = []} = room;
  if (speakers.includes(peerId)) return true;
  let newRoom = {...room, speakers: [...speakers, peerId]};
  return await put(state, `/rooms/${roomId}`, newRoom);
}

async function removeSpeaker(state, roomId, peerId) {
  let room = getCachedRoom(roomId);
  if (room === null) return false;
  let {speakers = []} = room;
  if (!speakers.includes(peerId)) return true;
  let newRoom = {...room, speakers: speakers.filter(id => id !== peerId)};
  return await put(state, `/rooms/${roomId}`, newRoom);
}
