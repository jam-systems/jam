import React from 'react';
import {Modal} from './Modal';
import {PrimaryButton} from './Button';

export default function InteractionModal({submit, close}) {
  return (
    <Modal close={close}>
      <h1>Allow playing sound</h1>
      <br />
      <p>Click OK to allow our page to play sound.</p>
      <br />
      <p>
        <PrimaryButton
          onClick={() => {
            submit();
            close();
          }}
        >
          OK
        </PrimaryButton>
      </p>
    </Modal>
  );
}
