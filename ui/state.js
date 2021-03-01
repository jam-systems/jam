import State from 'use-minimal-state';
import {DEV} from './config';
const state = State(
  {
    room: {name: '', description: '', speakers: [], moderators: []},
    soundMuted: true,
    micMuted: true,
    myAudio: null,
    speaking: new Set(),
    queries: {},
    audioContext: null,
    userInteracted: false,
    identities: {},
    reactions: {},
    modals: new Set(),
  },
  {debug: DEV}
);
export default state;
