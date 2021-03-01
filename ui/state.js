import State from 'use-minimal-state';
import {DEV} from './config';

export const emptyRoom = {
  name: '',
  description: '',
  speakers: [],
  moderators: [],
};

const state = State(
  {
    room: emptyRoom,
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

export function currentRoom() {
  return state.room || emptyRoom;
}
