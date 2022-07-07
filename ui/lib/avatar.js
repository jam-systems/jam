import {decode} from './identity-utils';

const defaultAvatar = `/img/avatar-default.png`;

const roomAvatar = (info, room) => {
  if (room.userDisplay?.identities) {
    return room.userDisplay.identities[info.id].avatar || defaultAvatar;
  } else if (room.userDisplay?.avatars) {
    return room.userDisplay.avatars[info.id] || defaultAvatar;
  } else if (room.userDisplay?.randomIdentities) {
    return selectFromList(info.id, room.userDisplay?.randomIdentities).avatar;
  } else if (room.userDisplay?.randomAvatars) {
    return selectFromList(info.id, room.userDisplay.randomAvatars);
  } else {
    return defaultAvatar;
  }
};

const roomDisplayName = (info, room) => {
  if (room.userDisplay?.identities) {
    return (
      room.userDisplay.identities[info.id].name ||
      selectFromList(info.id, names)
    );
  } else if (room.userDisplay?.names) {
    return room.userDisplay.names[info.id] || selectFromList(info.id, names);
  } else if (room.userDisplay?.randomIdentities) {
    return selectFromList(info.id, room.userDisplay?.randomIdentities).name;
  } else if (room.userDisplay?.randomNames) {
    return selectFromList(info.id, room.userDisplay?.randomNames);
  } else {
    return selectFromList(info.id, names);
  }
};

export const avatarUrl = (info, room) => {
  if (info.avatar && !room.access?.lockedIdentities) {
    return info.avatar;
  } else {
    return roomAvatar(info, room);
  }
};

export const displayName = (info, room) => {
  const infoName = info.name || info.displayName;
  if (infoName && !room.access?.lockedIdentities) {
    return infoName;
  } else {
    return roomDisplayName(info, room);
  }
};

const selectFromList = (id, list) => {
  return list[publicKeyToIndex(id, list.length)];
};

const names = [
  'Ali',
  'Alex',
  'Ash',
  'Blue',
  'Chi',
  'Drew',
  'Eight',
  'Fin',
  'Floor',
  'Five',
  'Four',
  'Jam',
  'Jaz',
  'Misha',
  'Mu',
  'Nine',
  'One',
  'Pat',
  'Sam',
  'Sasha',
  'Seven',
  'Six',
  'Sky',
  'Sol',
  'Storm',
  'Sun',
  'Tao',
  'Ten',
  'Three',
  'Tsu',
  'Two',
  'Yu',
  'Zero',
];

const integerFromBytes = rawBytes =>
  rawBytes[0] + (rawBytes[1] << 8) + (rawBytes[2] << 16) + (rawBytes[3] << 24);

function publicKeyToIndex(publicKey, range) {
  const bytes = decode(publicKey);
  return Math.abs(integerFromBytes(bytes)) % range;
}
