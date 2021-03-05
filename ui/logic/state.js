import State from 'use-minimal-state';
import {DEV} from './config';
const state = State(
  {
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
    modals: new Set(),
  },
  {debug: DEV}
);
export default state;

// mod visible state
export const modState = State({raiseHand: false});
