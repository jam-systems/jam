import React from 'react';
import {Modal, ShowModal} from './Modal';
import {PrimaryButton} from './Button';
import {useRootState, declare, dispatch} from '../lib/state-tree';
import {useStateObject} from './StateContext';
import {set} from 'use-minimal-state';

export function ShowInteractionModal() {
  let audioPlayError = useRootState('audioPlayError');
  declare(ShowModal, {
    component: InteractionModal,
    show: !!audioPlayError,
  });
}

export default function InteractionModal({close}) {
  const state = useStateObject();
  return (
    <Modal close={close}>
      <h1>Allow playing sound</h1>
      <br />
      <p>Click OK to allow our page to play sound.</p>
      <br />
      <p>
        <PrimaryButton
          onClick={() => {
            set(state, 'audioPlayError', false);
            dispatch(state, 'retry-audio-play');
            close();
          }}
        >
          OK
        </PrimaryButton>
      </p>
    </Modal>
  );
}
