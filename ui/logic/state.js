import Swarm from '../lib/swarm';
const state = {
  roomId: null,
  inRoom: null, // === roomId but only if entered
  room: {name: '', description: '', speakers: [], moderators: []},
  iAmSpeaker: false,
  iAmModerator: false,
  identities: {},
  otherDeviceInRoom: false,

  reactions: {},
  raisedHands: new Set(),

  micAllowed: false,
  soundMuted: true,
  micMuted: true,
  myMic: null,
  myAudio: null,

  speaking: new Set(),
  audioContext: null,

  queries: {},
  modMessages: {},
  userInteracted: false,
};
export default state;

const swarm = Swarm();
export {swarm};

// mod visible state
export const modState = {raiseHand: false};
