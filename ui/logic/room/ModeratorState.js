import {swarm} from '../state';
import {
  useDispatch,
  use,
  declare,
  useAction,
  useState,
} from '../../lib/state-tree';
import {shareStateWithGroup, shareStateWithPeer} from '../../lib/swarm';
import {useRootState} from '../../lib/state-tree';

export default function ModeratorState({moderators}) {
  let [isNewMod, peerId] = useAction('new-mod');
  let handRaised = useRootState('handRaised');
  let [isRaiseHand, hasRaisedHand] = useNewValue(handRaised, false);

  if (isRaiseHand) {
    console.error(
      'sending to moderator bc hand raised changed, new value',
      handRaised
    );
    shareStateWithGroup(swarm, 'moderator', {handRaised});
  }

  if (isNewMod && hasRaisedHand) {
    console.error('sending to new moderator', peerId, handRaised);
    shareStateWithPeer(swarm, peerId, {handRaised});
  }

  declare(NewModerator, {moderators});
}

function NewModerator() {
  let modPeers = new Set();
  let dispatch = useDispatch();

  return function NewModerator({moderators}) {
    let peers = Object.keys(use(swarm, 'stickyPeers'));
    let newModPeers;
    console.error(JSON.stringify(peers), JSON.stringify(moderators));
    [modPeers, newModPeers] = newIntersection(peers, moderators, modPeers);
    console.error(JSON.stringify([...newModPeers]));
    for (let peerId of newModPeers) {
      dispatch('new-mod', peerId);
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
