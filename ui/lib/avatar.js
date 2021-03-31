import {publicKeyToIndex} from "../logic/identity";

const roomAvatar = (info, room) => {

    if(room.userDisplay?.randomIdentities) {
        return selectFromList(info.id, room.userDisplay?.randomIdentities).avatar;
    } else if(room.userDisplay?.randomAvatars) {
        return selectFromList(info.id, room.userDisplay.randomAvatars);
    } else {
        return `/img/avatar-default.png`;
    }
}

const roomDisplayName = (info, room) => {

    if(room.userDisplay?.randomIdentities) {
        return selectFromList(info.id, room.userDisplay?.randomIdentities).name;
    } else if(room.userDisplay?.randomNames) {
        return selectFromList(info.id, room.userDisplay?.randomNames);
    } else {
        return selectFromList(info.id, names);
    }
}


export const avatarUrl = (info, room) => {
    if(info.avatar && (! room.access?.lockedIdentities)) {
        return info.avatar
    } else {
        return roomAvatar(info, room)
    }
};

export const displayName = (info, room) => {
    if(info.displayName && (! room.access?.lockedIdentities)) {
        return info.displayName
    } else {
        return roomDisplayName(info, room)
    }
}

const selectFromList = (id, list) => {
    return list[publicKeyToIndex(id, list.length)]
}

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
]
