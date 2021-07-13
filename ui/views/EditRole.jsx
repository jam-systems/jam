import React from 'react';
import {use} from 'use-minimal-state';
import {openModal} from './Modal';
import EditIdentity from './EditIdentity';
import {useMqParser} from '../lib/tailwind-mqp';
import {ButtonContainer, SecondaryButton} from './Button';
import StreamingModal from './StreamingModal';
import {useJam, useIdentityAdminStatus} from '../jam-core-react';

export default function EditRole({
  peerId,
  speakers,
  moderators,
  stageOnly = false,
  onCancel,
}) {
  const [state, api] = useJam();
  const {
    addSpeaker,
    addModerator,
    removeSpeaker,
    removeModerator,
    addAdmin,
    removeAdmin,
  } = api;
  let [myId, roomId] = use(state, ['myId', 'roomId']);
  let mqp = useMqParser();
  let [myAdminStatus] = useIdentityAdminStatus(myId);
  let [peerAdminStatus] = useIdentityAdminStatus(peerId);

  let isSpeaker = stageOnly || speakers.includes(peerId);
  let isModerator = moderators.includes(peerId);

  return (
    <div className={mqp('md:p-10')}>
      {myAdminStatus?.admin && (
        <div>
          <h3 className="font-medium">Admin Actions</h3>
          <br />
          {(peerAdminStatus?.admin && (
            <button
              onClick={() => removeAdmin(peerId).then(onCancel)}
              className={
                'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
              }
            >
              ❎️ Remove Admin
            </button>
          )) || (
            <button
              onClick={() => addAdmin(peerId).then(onCancel)}
              className={
                'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
              }
            >
              👑️ Make Admin
            </button>
          )}
          <br />
          <br />
          <hr />
          <br />
        </div>
      )}
      <h3 className="font-medium">Moderator Actions</h3>
      <br />
      {!stageOnly &&
        (isSpeaker ? (
          <button
            onClick={() => removeSpeaker(roomId, peerId).then(onCancel)}
            className="mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2"
          >
            ↓ Move to Audience
          </button>
        ) : (
          <button
            onClick={() => addSpeaker(roomId, peerId).then(onCancel)}
            className="mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2"
          >
            ↑ Invite to Stage
          </button>
        ))}
      {isSpeaker && !isModerator && (
        <button
          onClick={() => addModerator(roomId, peerId).then(onCancel)}
          className="mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2"
        >
          ✳️ Make Moderator
        </button>
      )}
      {isModerator && (
        <button
          onClick={() => removeModerator(roomId, peerId).then(onCancel)}
          className="mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2"
        >
          ❎ Demote Moderator
        </button>
      )}
      <button
        onClick={onCancel}
        className="mb-2 h-12 px-6 text-lg text-black bg-gray-100 rounded-lg focus:shadow-outline active:bg-gray-300"
      >
        Cancel
      </button>
      <br />
      <br />
      <hr />
    </div>
  );
}

export function EditSelf({onCancel}) {
  const [state, {leaveStage, addSpeaker, removeSpeaker}] = useJam();
  let mqp = useMqParser();
  let [iSpeak, iModerate, room, myId, roomId] = use(state, [
    'iAmSpeaker',
    'iAmModerator',
    'room',
    'myId',
    'roomId',
  ]);
  let stageOnly = !!room?.stageOnly;
  iSpeak = stageOnly || iSpeak;
  return (
    <div className={mqp('md:p-10')}>
      <h3 className="font-medium">Actions</h3>
      <br />
      <ButtonContainer>
        {!room.access?.lockedIdentities && (
          <SecondaryButton
            onClick={() => {
              openModal(EditIdentity);
              onCancel();
            }}
          >
            Edit Profile
          </SecondaryButton>
        )}
        {!stageOnly && iModerate && !iSpeak && (
          <SecondaryButton
            onClick={() => addSpeaker(roomId, myId).then(onCancel)}
          >
            ↑ Move to Stage
          </SecondaryButton>
        )}
        {!stageOnly && iModerate && iSpeak && (
          <SecondaryButton
            onClick={() => removeSpeaker(roomId, myId).then(onCancel)}
          >
            ↓ Leave Stage
          </SecondaryButton>
        )}
        {!stageOnly && !iModerate && iSpeak && (
          <SecondaryButton
            onClick={() => {
              leaveStage();
              onCancel();
            }}
          >
            ↓ Leave Stage
          </SecondaryButton>
        )}
        {iSpeak && (
          <SecondaryButton
            onClick={() => {
              openModal(StreamingModal);
              onCancel();
            }}
          >
            Stream audio
          </SecondaryButton>
        )}
        <SecondaryButton light onClick={onCancel}>
          Cancel
        </SecondaryButton>
      </ButtonContainer>
      <br />
      <br />
      <hr />
    </div>
  );
}
