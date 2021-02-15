import State from './lib/minimal-state.js';
const state = State({
  myInfo: {},
  soundMuted: true,
  micMuted: true,
  myAudio: null,
  speaking: new Set(),
  queries: {},
  audioContext: null,
  userInteracted: false,
  identities: {},
});
export default state;
