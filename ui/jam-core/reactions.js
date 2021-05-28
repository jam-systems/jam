import {update} from 'use-minimal-state';
import {useAction, useOn, useRootState} from '../lib/state-tree';
import {sendPeerEvent} from '../lib/swarm';
import {actions} from './state';

export {Reactions};

function Reactions({swarm}) {
  const state = useRootState();

  useOn(swarm.peerEvent, 'reaction', (peerId, reaction) => {
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

  return function Reactions() {
    let [isReaction, reaction] = useAction(actions.REACTION);
    if (isReaction) {
      sendPeerEvent(swarm, 'reaction', reaction);
      showReaction(reaction, swarm.myPeerId);
    }
  };
}
