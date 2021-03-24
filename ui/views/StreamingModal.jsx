import React from 'react';
import {Modal} from './Modal';
import {PrimaryButton, SecondaryButton} from './Button';
import {LabeledInput, useFileInput} from './Input';
import {streamAudioFromUrl} from '../logic/audio';

export default function StreamingModal({close}) {
  // let [urlValue, urlInput] = useInput();
  let [getFile, fileInput] = useFileInput();
  let submit = async e => {
    e.preventDefault();
    let file = getFile();
    let url = file && URL.createObjectURL(file); // : urlValue;
    if (url) {
      streamAudioFromUrl(url, file.name);
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
          accept="audio/*"
          {...fileInput}
          label="Stream audio from file"
          optional
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
            Done
          </PrimaryButton>
          <SecondaryButton light className="flex-none" onClick={close}>
            Cancel
          </SecondaryButton>
        </div>
      </form>
    </Modal>
  );
}
