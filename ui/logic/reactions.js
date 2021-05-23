import {update, on} from 'use-minimal-state';
import {sendPeerEvent} from '../lib/swarm';
import state, {swarm} from './state';

export {sendReaction};

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
