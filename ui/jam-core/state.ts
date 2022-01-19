import {Action} from '../lib/state-tree';
export {defaultProps, defaultState};
export {StateType, IdentityInfo, IdentityType, RoomType, ActionType, Props};

const defaultProps = {
  roomId: null as string | null,
  userInteracted: false,
  micMuted: false,
  handRaised: false,
  autoJoin: false,
  hasMediasoup: false,
  customStream: null,
};
type Props = typeof defaultProps;
type ActionType = string | {type: string};

type IdentityInfo = {
  id?: string;
  name?: string;
  avatar?: string;
  identities?: {type: string; id: string; verificationInfo: string}[];
};
type IdentityType = {
  publicKey: string;
  secretKey: string;
  info: IdentityInfo;
};
type RoomType = {
  name: string;
  description?: string;
  speakers: string[];
  moderators: string[];
  stageOnly?: boolean;
  color?: string;
  logoURI?: string;
};
type PeerState = {
  inRoom: boolean;
  micMuted: boolean;
  leftStage: boolean;
  isRecording: boolean;
};

const defaultState = {
  myIdentity: null as IdentityType | null,
  myId: null as string | null,

  roomId: null as string | null,
  inRoom: null as string | null, // === roomId if user joined, null otherwise
  room: {name: '', description: '', speakers: [], moderators: []} as RoomType,
  hasRoom: false,
  isRoomLoading: false,
  iAmSpeaker: false,
  iAmModerator: false,
  identities: {} as Record<string, IdentityInfo>,
  otherDeviceInRoom: false,

  swarm: null,
  peers: [] as string[],
  peerState: {} as Record<string, PeerState | undefined>,
  myPeerState: {
    inRoom: false,
    micMuted: false,
    leftStage: false,
    isRecording: false,
  },

  reactions: {},
  handRaised: false,

  soundMuted: true,
  micMuted: false,
  audioFile: null,
  audioFileElement: null,
  myAudio: null as MediaStream | null,
  audioPlayError: false,
  hasMicFailed: false,

  speaking: new Set<string>(),

  isRecording: false, // am I recording?
  isSomeoneRecording: false, // is someone in the room recording?
  recordedAudio: null as Blob | null,

  isPodcasting: false,
  isSomeonePodcasting: false,
  podcastTracks: {} as Record<string, Blob>,
};

type StateType = typeof defaultState & {swarm: any};

export const actions = {
  JOIN: Action('join'),
  LEAVE_STAGE: Action('leave-stage'),
  RETRY_MIC: Action('retry-mic'),
  RETRY_AUDIO: Action('retry-audio'),
  REACTION: Action('reaction'),
  AUTO_JOIN: Action('auto-join'),
};
