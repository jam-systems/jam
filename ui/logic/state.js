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
  handRaised: false,

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
  JOIN: 'join',
  LEAVE_STAGE: 'leave-stage',
  RETRY_MIC: 'retry-mic',
  REACTION: 'reaction',
};

const swarm = Swarm();
export {swarm};
