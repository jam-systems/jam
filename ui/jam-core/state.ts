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

const defaultState = {
  myIdentity: null as IdentityType | null,
  myId: null as string | null,

  roomId: ((window as any).existingRoomId as string | null) ?? null,
  inRoom: null as string | null, // === roomId but only if entered
  room: {name: '', description: '', speakers: [], moderators: []} as RoomType,
  iAmSpeaker: false,
  iAmModerator: false,
  identities: {},
  otherDeviceInRoom: false,

  swarm: null,

  reactions: {},
  handRaised: false,

  soundMuted: true,
  micMuted: false,
  audioFile: null,
  audioFileElement: null,
  myAudio: null as MediaStream | null,
  audioPlayError: false,

  speaking: new Set<string>(),

  isRecording: false,
  recordedAudio: null as Blob | null,
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
