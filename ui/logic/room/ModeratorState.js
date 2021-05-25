import {swarm} from '../state';
import {use, declare, useState, useCallback} from '../../lib/state-tree';
import {shareStateWithGroup, shareStateWithPeer} from '../../lib/swarm';
import {useRootState} from '../../lib/state-tree';

export default function ModeratorState({moderators}) {
  // let [isNewMod, peerId] = useAction('new-mod');
  let handRaised = useRootState('handRaised');
  let [isRaiseHand, hasRaisedHand] = useNewValue(handRaised, false);

  if (isRaiseHand) {
    console.log('sharing state with moderators');
    shareStateWithGroup(swarm, 'moderator', {handRaised});
  }

  // if (isNewMod && hasRaisedHand) {
  //   shareStateWithPeer(swarm, peerId, {handRaised});
  // }

  let onNewModerator = useCallback(
    peerId => {
      if (hasRaisedHand) {
        shareStateWithPeer(swarm, peerId, {handRaised});
      }
    },
    [handRaised, hasRaisedHand]
  );
  declare(NewModerator, {moderators, onNewModerator});
}

function NewModerator() {
  let modPeers = new Set();
  // let dispatch = useDispatch();

  return function NewModerator({moderators, onNewModerator}) {
    let peers = Object.keys(use(swarm, 'stickyPeers'));
    let newModPeers;
    [modPeers, newModPeers] = newIntersection(peers, moderators, modPeers);
    for (let peerId of newModPeers) {
      // dispatch('new-mod', peerId);
      onNewModerator(peerId);
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
