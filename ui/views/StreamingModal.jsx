import React from 'react';
import {Modal} from './Modal';
import {PrimaryButton, SecondaryButton} from './Button';
import {LabeledInput, useFileInput} from './Input';
import state from '../logic/state';
import {set} from 'use-minimal-state';

export default function StreamingModal({close}) {
  // let [urlValue, urlInput] = useInput();
  let [getFile, fileInput] = useFileInput();
  let submit = async e => {
    e.preventDefault();
    let file = getFile();
    // TODO: createObjectURL takes long, show loading indicator
    let url = file && URL.createObjectURL(file); // : urlValue;
    if (url) {
      set(state, 'audioFile', {url, name: file.name});
      close();
    }
  };
  return (
    <Modal close={close}>
      <h1>Stream audio</h1>
      <br />
      <form onSubmit={submit} className="text-gray-500">
        {/* <p>You can have several options to add an audio source</p>
        <br /> */}
        <LabeledInput
          accept="audio/*,.mp3,.wav,.m4a,.oga,.3gp,.3g2,.aiff,.mp4"
          {...fileInput}
          label="Stream audio from file"
        />
        <br />
        {/* <LabeledInput
          placeholder="Audio source URL"
          {...urlInput}
          label="Stream audio from URL"
          optional
        />
        <br /> */}
        <div className="spaced-w-2 flex">
          <PrimaryButton onClick={submit} className="flex-grow">
            Stream
          </PrimaryButton>
          <SecondaryButton light className="flex-none" onClick={close}>
            Cancel
          </SecondaryButton>
        </div>
      </form>
    </Modal>
  );
}
