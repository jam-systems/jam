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

  reactions: {},
  raisedHands: new Set(),

  micAllowed: false,
  soundMuted: true,
  micMuted: true,
  myAudio: null,
  speaking: new Set(),
  audioContext: null,

  queries: {},
  modMessages: {},
  userInteracted: false,
});
export default state;

if (DEV) debug(state);

// mod visible state
export const modState = State({raiseHand: false});
