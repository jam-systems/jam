import React from 'react';
import {Modal} from './Modal';
import {state} from '../logic/main';
import {set, is} from 'use-minimal-state';
import {PrimaryButton} from './Button';

export default function InteractionModal({close}) {
  return (
    <Modal close={close}>
      <h1>Allow playing sound</h1>
      <br />
      <p>Click OK to allow our page to play sound.</p>
      <br />
      <p>
        <PrimaryButton
          onClick={() => {
            set(state, 'soundMuted', false);
            is(state, 'userInteracted', true);
            close();
          }}
        >
          OK
        </PrimaryButton>
      </p>
    </Modal>
  );
}
