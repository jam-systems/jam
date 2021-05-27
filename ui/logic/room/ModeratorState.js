import {swarm} from '../state';
import {use, event, useState, useRootState, Atom} from '../../lib/state-tree';
import {shareStateWithGroup, shareStateWithPeer} from '../../lib/swarm';

export default function ModeratorState({moderators}) {
  let handRaised = useRootState('handRaised');
  let [isRaiseHand, hasRaisedHand] = useNewValue(handRaised, false);
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

function useNewValue(value, initial) {
  let [hasChanged, setChanged] = useState(false);
  let [value_, setValue] = useState(initial);
  if (value !== value_) {
    setValue(value);
    setChanged(true);
    return [true, true];
  } else {
    return [false, hasChanged];
  }
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
