import {Action} from '../lib/state-tree';
export {defaultProps, defaultState};

const defaultProps = {
  roomId: null,
  userInteracted: false,
  micMuted: false,
  autoJoin: false,
};

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

  reactions: {},
  handRaised: false,

  soundMuted: true,
  micMuted: false,
  audioFile: null,
  audioFileElement: null,
  myAudio: null,
  audioPlayError: false,

  speaking: new Set(),
};

export const actions = {
  JOIN: Action('join'),
  LEAVE_STAGE: Action('leave-stage'),
  RETRY_MIC: Action('retry-mic'),
  RETRY_AUDIO: Action('retry-audio'),
  REACTION: Action('reaction'),
  AUTO_JOIN: Action('auto-join'),
};
