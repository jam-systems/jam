import {set, update, on} from 'use-minimal-state';
import swarm from '../lib/swarm';
import {get, post, deleteRequest} from './backend';
import identity, {signedToken} from './identity';
import state from './state';

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

async function raiseHand(raise) {
  let {iAmSpeaker, roomId, raisedHands} = state;
  if (iAmSpeaker) return;
  if (raise) {
    raisedHands.add(identity.publicKey);
    update(state, 'raisedHands');
    await post(
      signedToken(),
      `/rooms/${roomId}/raisedHands/${identity.publicKey}`
    );
  } else {
    raisedHands.delete(identity.publicKey);
    update(state, 'raisedHands');
    await deleteRequest(
      signedToken(),
      `/rooms/${roomId}/raisedHands/${identity.publicKey}`
    );
  }
}
// fetch raised hands when we become moderator
on(state, 'iAmModerator', async i => {
  if (i) {
    try {
      let hands = await get(`/rooms/${state.roomId}/raisedHands`);
      set(state, 'raisedHands', new Set(hands));
    } catch (err) {
      console.warn(err);
    }
  }
});
// listen for raised hands
async function onRaiseHand() {
  let {iAmModerator, roomId} = state;
  if (iAmModerator && roomId) {
    try {
      let hands = await get(`/rooms/${roomId}/raisedHands`);
      set(state, 'raisedHands', new Set(hands));
    } catch (err) {
      console.warn(err);
    }
  }
}
swarm.on('connected', () => {
  swarm.hub?.subscribeAnonymous('raised-hands-changed', () => {
    onRaiseHand();
  });
});
// v this is the API i'd want instead
// swarm.on('anonymous', async ({raisedHand}) => {
//   if (raisedHand) onRaiseHand();
// }

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
