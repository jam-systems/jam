import {Action} from '../lib/state-tree';
export {defaultState};

const defaultState = {
  myIdentity: null,
  myId: null,

  roomId: window.existingRoomId ?? null,
  inRoom: null, // === roomId but only if entered
  room: {name: '', description: '', speakers: [], moderators: []},
  iAmSpeaker: false,
  iAmModerator: false,
  identities: {},
  otherDeviceInRoom: false,
  leftStage: false,

  reactions: {},
  handRaised: false,

  soundMuted: true,
  micMuted: false,
  audioFile: null,
  audioFileElement: null,
  myAudio: null,
  audioPlayError: false,

  speaking: new Set(),

  userInteracted: false,
};

export const actions = {
  JOIN: Action('join'),
  LEAVE_STAGE: Action('leave-stage'),
  RETRY_MIC: Action('retry-mic'),
  RETRY_AUDIO: Action('retry-audio'),
  REACTION: Action('reaction'),
};
