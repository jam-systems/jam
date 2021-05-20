import Swarm from '../lib/swarm';
const state = {
  roomId: window.existingRoomId ?? null,
  inRoom: null, // === roomId but only if entered
  room: {name: '', description: '', speakers: [], moderators: []},
  iAmSpeaker: false,
  iAmModerator: false,
  identities: {},
  otherDeviceInRoom: false,

  reactions: {},
  raisedHands: new Set(),

  soundMuted: true,
  micMuted: false,
  audioFile: null,
  audioFileElement: null,
  myAudio: null,

  speaking: new Set(),
  audioContext: null,

  modMessages: {},
  userInteracted: false,
};
export default state;

export const actions = {
  RETRY_MIC: 'retry-mic',
};

const swarm = Swarm();
export {swarm};

// mod visible state
export const modState = {raiseHand: false};
