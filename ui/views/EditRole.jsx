import React from 'react';
import {addRole, removeRole, leaveStage} from '../logic/room';
import identity from '../logic/identity';
import {state} from '../logic/main';
import {use} from 'use-minimal-state';
import {openModal} from './Modal';
import EditIdentity from './EditIdentity';
import {useMqParser} from '../logic/tailwind-mqp';

export default function EditRole({peerId, speakers, moderators, onCancel}) {
  let mqp = useMqParser();
  return (
    <div className={mqp('md:p-10')}>
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
  let myPeerId = identity.publicKey;
  let [iSpeak, iModerate] = use(state, ['iAmSpeaker', 'iAmModerator']);
  return (
    <div className={mqp('md:p-10')}>
      <h3 className="font-medium">Actions</h3>
      <br />
      <button
        onClick={() => {
          openModal(EditIdentity);
          onCancel();
        }}
        className={
          'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
        }
      >
        Edit Profile
      </button>
      {iModerate && !iSpeak && (
        <button
          onClick={() => addRole(myPeerId, 'speakers').then(onCancel)}
          className={
            'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
          }
        >
          ↑ Move to Stage
        </button>
      )}
      {iModerate && iSpeak && (
        <button
          onClick={() => removeRole(myPeerId, 'speakers').then(onCancel)}
          className={
            'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
          }
        >
          ↓ Leave Stage
        </button>
      )}
      {!iModerate && iSpeak && (
        <button
          onClick={() => {
            leaveStage();
            onCancel();
          }}
          className={
            'mb-2 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300 mr-2'
          }
        >
          ↓ Leave Stage
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
