import State from './lib/minimal-state.js';
const state = State({
  room: {name: '', description: '', speakers: [], moderators: []},
  myInfo: {},
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
});
export default state;
