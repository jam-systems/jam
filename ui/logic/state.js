import State from 'use-minimal-state';
import {DEV} from './config';
import {debug} from './util';
const state = State({
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
});
export default state;

// actions that can be emitted to trigger events
// emit(action.NAME, payload)
// on(action.NAME, payload => {})
export const actions = {
  ENTER: [],
};

if (DEV) debug(state);

// mod visible state
export const modState = {raiseHand: false};
