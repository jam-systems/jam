import {set, update, on, is} from 'use-minimal-state';
import {sendPeerEvent} from '../lib/swarm';
import {currentId} from './identity';
import state, {modState, swarm} from './state';

export {sendReaction, raiseHand};

function sendReaction(reaction) {
  sendPeerEvent(swarm, 'reaction', reaction);
  showReaction(reaction, swarm.myPeerId);
}
// listen for reactions
on(swarm.peerEvent, 'reaction', (peerId, reaction) => {
  if (peerId === swarm.myPeerId) return;
  if (reaction) showReaction(reaction, peerId);
});
function showReaction(reaction, peerId) {
  let {reactions} = state;
  if (!reactions[peerId]) reactions[peerId] = [];
  let reactionObj = [reaction, Math.random()];
  reactions[peerId].push(reactionObj);
  update(state, 'reactions');
  setTimeout(() => {
    let i = reactions[peerId].indexOf(reactionObj);
    if (i !== -1) reactions[peerId].splice(i, 1);
    update(state, 'reactions');
  }, 5000);
}

function raiseHand(raise) {
  // make visible to me
  if (raise) {
    state.raisedHands.add(currentId());
  } else {
    state.raisedHands.delete(currentId());
  }
  update(state, 'raisedHands');
  // make visible to mods
  is(modState, 'raiseHand', !!raise);
}

// listen for raised hands
on(state, 'modMessages', modMessages => {
  let hands = new Set();
  for (let peerId in modMessages) {
    if (modMessages[peerId].raiseHand) hands.add(peerId);
  }
  set(state, 'raisedHands', hands);
});
