import {set, update, on} from 'use-minimal-state';
import swarm from '../lib/swarm';
import {post, authedGet} from './backend';
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

async function raiseHand(raise) {
  if (raise) {
    state.raisedHands.add(identity.publicKey);
    update(state, 'raisedHands');
    sendModMessage({raiseHand: true});
  } else {
    state.raisedHands.delete(identity.publicKey);
    update(state, 'raisedHands');
    sendModMessage({raiseHand: false});
  }
}
// post initial raised hand status on entering room
on(state, 'inRoom', id => {
  if (id) raiseHand(false);
});
// listen for raised hands
on(state, 'modMessages', modMessages => {
  let hands = new Set();
  for (let peerId in modMessages) {
    if (modMessages[peerId].raiseHand) hands.add(peerId);
  }
  set(state, 'raisedHands', hands);
});

async function sendModMessage(msg) {
  let {inRoom} = state;
  if (inRoom) {
    await post(
      signedToken(),
      `/rooms/${inRoom}/modMessage/${identity.publicKey}`,
      msg
    );
  }
}
// fetch mod messages when we become moderator
on(state, 'iAmModerator', async iAmModerator => {
  if (iAmModerator) {
    let [msgs, ok] = await authedGet(
      signedToken(),
      `/rooms/${state.roomId}/modMessage`
    );
    if (ok) set(state, 'modMessages', msgs);
  }
});
// listen for mod message pings and fetch if we are moderator
on(swarm, 'anonymous', async ({modMessage}) => {
  let {iAmModerator, roomId} = state;
  if (modMessage && iAmModerator && roomId) {
    let [msgs, ok] = await authedGet(
      signedToken(),
      `/rooms/${state.roomId}/modMessage`
    );
    if (ok) set(state, 'modMessages', msgs);
  }
});
