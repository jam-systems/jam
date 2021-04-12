import {set, update, on} from 'use-minimal-state';
import swarm from '../lib/swarm';
import {requestAudio, stopAudio} from './audio';
import { currentId } from './identity';
import state, {modState} from './state';

export {sendReaction, raiseHand};

function sendReaction(reaction) {
  swarm.emit('sharedEvent', {reaction});
  showReaction(reaction, swarm.myPeerId);
}
// listen for reactions
swarm.on('peerEvent', (peerId, data) => {
  if (peerId === swarm.myPeerId) return;
  let {reaction} = data;
  if (reaction) showReaction(reaction, peerId);
});
function showReaction(reaction, peerId) {
  let {reactions} = state;
  if (!reactions[peerId]) reactions[peerId] = [];
  let reactionObj = [reaction, Math.random()];
  reactions[peerId].push(reactionObj);
  state.update('reactions');
  setTimeout(() => {
    let i = reactions[peerId].indexOf(reactionObj);
    if (i !== -1) reactions[peerId].splice(i, 1);
    state.update('reactions');
  }, 5000);
}

function raiseHand(raise) {
  // make visible to me
  if (raise) {
    state.raisedHands.add(currentId());
    requestAudio();
  } else {
    state.raisedHands.delete(currentId());
    stopAudio();
  }
  update(state, 'raisedHands');
  // make visible to mods
  set(modState, 'raiseHand', !!raise);
}

// listen for raised hands
on(state, 'modMessages', modMessages => {
  let hands = new Set();
  for (let peerId in modMessages) {
    if (modMessages[peerId].raiseHand) hands.add(peerId);
  }
  set(state, 'raisedHands', hands);
});
