import State from 'use-minimal-state';
import {DEV} from './config';
const state = State(
  {
    room: {name: '', description: '', speakers: [], moderators: []},
    iAmSpeaker: false,
    iAmModerator: false,
    identities: {},

    reactions: {},

    soundMuted: true,
    micMuted: true,
    myAudio: null,
    speaking: new Set(),
    audioContext: null,

    queries: {},
    userInteracted: false,
    modals: new Set(),
  },
  {debug: DEV}
);
export default state;
