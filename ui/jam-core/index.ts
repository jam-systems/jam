import {Identity, updateInfo} from './identity';
import {
  defaultState,
  actions,
  defaultProps,
  IdentityInfo,
  StateType,
  RoomType,
  Props,
} from './state';
import {AudioState} from './audio';
import {Reactions} from './reactions';
import {
  RoomState,
  addSpeaker,
  addModerator,
  removeSpeaker,
  removeModerator,
} from './room';
import {is, set, on, update} from 'minimal-state';
import {
  debugStateTree,
  declare,
  declareStateRoot,
  merge,
  use,
  useAction,
} from '../lib/state-tree';
import {debug} from '../lib/state-utils';
import ModeratorState from './room/ModeratorState';
import {staticConfig} from './config';
import Swarm from '../lib/swarm';
import {populateApiCache, createRoom, updateRoom} from './backend';
import {addAdmin, removeAdmin} from './admin';
import ConnectAudio from './connections/ConnectAudio';
import ConnectRoom from './connections/ConnectRoom';
import {StoredState} from '../lib/local-storage';

type Action = string | {type: string};

/* THE JAM API */

export {createJam};
export {importRoomIdentity} from './identity';
export {is, set, on, update, until};

function createApi<T>(
  state: T,
  dispatch: (type: Action, payload?: unknown) => Promise<void>,
  setProps: {
    <K extends keyof Props>(key: K, value: Props[K]): Promise<void>;
    (state: Partial<Props>): Promise<void>;
  }
) {
  return {
    setProps,
    setState: (<L extends keyof T>(
      keyOrValue: L | Partial<T>,
      value?: T[L]
    ) => {
      (is as any)(state, keyOrValue, value);
    }) as {
      <L extends keyof T>(key: L, value: T[L]): void;
      (state: Partial<T>): void;
    },
    onState: ((keyOrListener, listenerOrNone) => {
      return on(state, keyOrListener, listenerOrNone);
    }) as {
      (
        key: keyof T | undefined,
        listener: (...args: unknown[]) => void
      ): () => void;
    },
    // create room with the own identity as the only moderator and speaker
    createRoom: (roomId: string, partialRoom?: Partial<RoomType>) =>
      createRoom(state, roomId, partialRoom) as Promise<boolean>,

    // completely replaces the room, rejects if moderator/speaker array is not set
    // only possible for moderators
    updateRoom: (roomId: string, room: RoomType) =>
      updateRoom(state, roomId, room) as Promise<boolean>,

    addSpeaker: (roomId: string, peerId: string) =>
      addSpeaker(state, roomId, peerId) as Promise<boolean>,
    addModerator: (roomId: string, peerId: string) =>
      addModerator(state, roomId, peerId) as Promise<boolean>,
    removeSpeaker: (roomId: string, peerId: string) =>
      removeSpeaker(state, roomId, peerId) as Promise<boolean>,
    removeModerator: (roomId: string, peerId: string) =>
      removeModerator(state, roomId, peerId) as Promise<boolean>,
    addAdmin: (peerId: string) => addAdmin(state, peerId) as Promise<boolean>,
    removeAdmin: (peerId: string) =>
      removeAdmin(state, peerId) as Promise<boolean>,

    updateInfo: (info: IdentityInfo) => updateInfo(state, info),

    enterRoom: (roomId: string) => dispatch(actions.JOIN, roomId),
    leaveRoom: () => dispatch(actions.JOIN, null),
    leaveStage: () => dispatch(actions.LEAVE_STAGE),
    sendReaction: (reaction: string) => dispatch(actions.REACTION, reaction),
    retryMic: () => dispatch(actions.RETRY_MIC),
    retryAudio: () => dispatch(actions.RETRY_AUDIO),
    autoJoinOnce: () => dispatch(actions.AUTO_JOIN),
  };
}

function createJam(
  {jamConfig, cachedRooms, debug: debug_ = false} = {} as {
    jamConfig: Partial<typeof staticConfig>;
    cachedRooms: {[K in string]: RoomType};
    debug: boolean;
  }
) {
  // setup stuff
  if (jamConfig) set(staticConfig, jamConfig);
  if (cachedRooms) {
    for (let roomId in cachedRooms) {
      populateApiCache(`/rooms/${roomId}`, cachedRooms[roomId]);
    }
  }
  if (debug_ || jamConfig?.development) {
    if (debug_) (window as any).DEBUG = true;
    debugStateTree();
  }

  let props = {...defaultProps, hasMediasoup: !!staticConfig.sfu};
  const {state, dispatch, setProps} = declareStateRoot(AppState, props, {
    state: undefined,
    defaultState,
  }) as {
    state: StateType;
    dispatch: (type: Action, payload?: unknown) => Promise<void>;
    setProps: {
      <K extends keyof Props>(key: K, value: Props[K]): Promise<void>;
      (state: Partial<Props>): Promise<void>;
    };
  };
  const api = createApi(state, dispatch, setProps);

  if (debug_ || jamConfig?.development) {
    if (debug_) debug(state.swarm);
    (window as any).swarm = state.swarm;
    (window as any).state = state;
    debug(state);
  }
  return [state, api] as const;
}

function AppState({hasMediasoup}) {
  const swarm = Swarm();
  const {peerState, myPeerState} = swarm;
  is(myPeerState, {inRoom: false, micMuted: false, leftStage: false});

  return function AppState({
    roomId,
    userInteracted,
    micMuted,
    autoJoin,
    autoRejoin,
  }) {
    let {myId, myIdentity} = use(Identity, {roomId});

    let {room, hasRoom, iAmSpeaker, iAmModerator} = use(RoomState, {
      roomId,
      myId,
      myIdentity,
      peerState,
      myPeerState,
    });
    let {closed, moderators, speakers} = room;
    let inRoom = use(InRoom, {
      roomId,
      autoJoin,
      autoRejoin,
      iAmModerator,
      hasRoom,
      closed,
    });

    // connect with signaling server
    declare(ConnectRoom, {
      swarm,
      myId,
      myIdentity,
      roomId,
      shouldConnect: hasRoom,
    });
    declare(ModeratorState, {swarm, moderators});

    let remoteStreams = use(ConnectAudio, {
      hasMediasoup,
      swarm,
      roomId,
      iAmSpeaker,
      speakers,
    });

    is(myPeerState, {micMuted, inRoom: !!inRoom});
    declare(Reactions, {swarm});

    return merge(
      {
        swarm,
        roomId,
        micMuted,
        inRoom,
        room,
        iAmSpeaker,
        iAmModerator,
        myId,
        myIdentity,
      },
      declare(AudioState, {
        myId,
        inRoom,
        iAmSpeaker,
        swarm,
        remoteStreams,
        userInteracted,
        micMuted,
      })
    );
  };
}

function InRoom() {
  let inRoom = null;
  let autoJoinCount = 0;
  let didAutoJoin = false;
  const joinedRooms = StoredState('jam.joinedRooms', () => ({}));

  return function InRoom({
    roomId,
    autoJoin,
    autoRejoin,
    iAmModerator,
    hasRoom,
    closed,
  }) {
    let [isJoinRoom, joinedRoomId] = useAction(actions.JOIN);
    let [isAutoJoin] = useAction(actions.AUTO_JOIN);
    if ((isAutoJoin || (autoJoin && !didAutoJoin)) && autoJoinCount === 0) {
      didAutoJoin = true;
      autoJoinCount = 1;
    }

    if (!roomId || (closed && !iAmModerator)) {
      inRoom = null;
    } else {
      if (isJoinRoom) {
        inRoom = joinedRoomId; // can be null, for leaving room
      } else if (autoRejoin && hasRoom && joinedRooms[roomId]) {
        inRoom = roomId;
      }
      if (autoJoinCount > 0 && hasRoom) {
        autoJoinCount--;
        inRoom = roomId;
      }
    }

    if (autoRejoin) is(joinedRooms, roomId, inRoom !== null || undefined);
    return inRoom;
  };
}

async function until<T, K extends keyof T>(
  state: T,
  key: K,
  condition?: (value: T[K]) => boolean
) {
  let value = state[key];
  if (condition ? condition(value) : value) {
    return value;
  } else {
    return new Promise(resolve => {
      let off = on(state, key, value => {
        if (condition ? condition(value as T[K]) : value) {
          off();
          resolve(value);
        }
      });
    });
  }
}
