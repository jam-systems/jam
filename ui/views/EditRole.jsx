import React from 'react';
import {addRole, removeRole, leaveStage} from '../logic/room';
import {addAdmin, removeAdmin, useIdentityAdminStatus} from '../logic/admin';
import {currentId} from '../logic/identity';
import {state} from '../logic/main';
import {use} from 'use-minimal-state';
import {openModal} from './Modal';
import EditIdentity from './EditIdentity';
import {useMqParser} from '../logic/tailwind-mqp';
import {ButtonContainer, SecondaryButton} from './Button';
import StreamingModal from './StreamingModal';

export default function EditRole({peerId, speakers, moderators, onCancel}) {
  let mqp = useMqParser();
  let [myAdminStatus] = useIdentityAdminStatus(currentId());
  let [peerAdminStatus] = useIdentityAdminStatus(peerId);
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
      <button
        onClick={() => addRole(peerId, 'speakers').then(onCancel)}
        className={
          speakers.includes(peerId)
            ? 'hidden'
            : 'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
        }
      >
        ↑ Invite to Stage
      </button>
      <button
        onClick={() => removeRole(peerId, 'speakers').then(onCancel)}
        className={
          speakers.includes(peerId)
            ? 'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
            : 'hidden'
        }
      >
        ↓ Move to Audience
      </button>
      <button
        onClick={() => addRole(peerId, 'moderators').then(onCancel)}
        className={
          !speakers.includes(peerId) || moderators.includes(peerId)
            ? 'hidden'
            : 'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
        }
      >
        ✳️ Make Moderator
      </button>
      <button
        onClick={() => removeRole(peerId, 'moderators').then(onCancel)}
        className={
          moderators.includes(peerId)
            ? 'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
            : 'hidden'
        }
      >
        ❎ Demote Moderator
      </button>
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
  let mqp = useMqParser();
  let myPeerId = currentId();
  let [iSpeak, iModerate, room] = use(state, [
    'iAmSpeaker',
    'iAmModerator',
    'room',
  ]);
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
        {iModerate && !iSpeak && (
          <SecondaryButton
            onClick={() => addRole(myPeerId, 'speakers').then(onCancel)}
          >
            ↑ Move to Stage
          </SecondaryButton>
        )}
        {iModerate && iSpeak && (
          <SecondaryButton
            onClick={() => removeRole(myPeerId, 'speakers').then(onCancel)}
          >
            ↓ Leave Stage
          </SecondaryButton>
        )}
        {!iModerate && iSpeak && (
          <SecondaryButton
            onClick={() => {
              leaveStage();
              onCancel();
            }}
          >
            ↓ Leave Stage
          </SecondaryButton>
        )}
        {iModerate && iSpeak && (
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
