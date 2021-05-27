import {swarm} from '../state';
import {use, event, useRootState, Atom} from '../../lib/state-tree';
import {shareStateWithGroup, shareStateWithPeer} from '../../lib/swarm';
import {useDidEverChange} from '../../lib/state-utils';

export default function ModeratorState({moderators}) {
  let handRaised = useRootState('handRaised');
  let [isRaiseHand, hasRaisedHand] = useDidEverChange(handRaised, false);
  let newModerators = event(NewModerators, {moderators});

  if (isRaiseHand) {
    shareStateWithGroup(swarm, 'moderator', {handRaised});
  }

  if (hasRaisedHand && newModerators) {
    for (let peerId of newModerators) {
      shareStateWithPeer(swarm, peerId, {handRaised});
    }
  }
}

function NewModerators() {
  let modPeers = new Set();

  return function NewModerators({moderators}) {
    let peers = Object.keys(use(swarm, 'stickyPeers'));
    let newModPeers;
    [modPeers, newModPeers] = newIntersection(peers, moderators, modPeers);
    if (newModPeers.size > 0) {
      return Atom(newModPeers);
    }
  };
}

function newIntersection(arrA, arrB, AnB) {
  let newAnB = new Set();
  let added = new Set();
  for (let x of arrA) {
    if (arrB.includes(x)) {
      newAnB.add(x);
      if (!AnB.has(x)) {
        added.add(x);
      }
    }
  }
  return [newAnB, added];
}
