import State, {set, update, on} from 'use-minimal-state';
import swarm from '../lib/swarm';
import {post, authedGet} from './backend';
import identity, {signedToken} from './identity';
import state from './state';
import {pure} from '../lib/local-storage';

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
  // make visible to me
  if (raise) {
    state.raisedHands.add(identity.publicKey);
  } else {
    state.raisedHands.delete(identity.publicKey);
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

// mod message / mod visible state
const modState = State({raiseHand: false});

// post initial status on entering room
on(state, 'inRoom', () => {
  sendModMessage(pure(modState));
});
// post on changes
on(modState, () => {
  sendModMessage(pure(modState));
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
