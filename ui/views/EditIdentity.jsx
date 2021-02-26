import React, {useState} from 'react';
import SparkMD5 from 'spark-md5';
import swarm from '../lib/swarm';
import state from '../state';
import {Modal} from './Modal';

let updateInfo = info => {
  if (info.twitter) {
    let twitter = info.twitter.trim();
    if (!twitter.includes('@')) twitter = '@' + twitter;
    info.twitter = twitter;
  }
  state.set('myInfo', oldInfo => ({...oldInfo, ...info}));
  swarm.hub.broadcast('identity-updates', {});
};

export default function EditIdentity({close, info}) {
  let [displayName, setDisplayName] = useState(info?.displayName);
  let [email, setEmail] = useState(info?.email);
  let [twitter, setTwitter] = useState(info?.twitter);
  let emailHash = email ? SparkMD5.hash(email) : info?.emailHash;
  let submit = e => {
    let selectedFile = document.querySelector('.edit-profile-file-input')
      .files[0];
    if (selectedFile) {
      console.log('file selected');
      let reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = () => {
        e.preventDefault();
        let avatar = reader.result;
        console.log(avatar);
        updateInfo({displayName, twitter, emailHash, avatar});
      };
    }
    e.preventDefault();
    updateInfo({displayName, twitter, emailHash});
    close();
  };
  let cancel = e => {
    e.preventDefault();
    close();
  };
  return (
    <Modal close={close}>
      <h1>Edit Profile</h1>
      <br />
      <form onSubmit={submit}>
        <input
          className="rounded placeholder-gray-400 bg-gray-50 w-48"
          type="text"
          placeholder="Display name"
          value={displayName || ''}
          name="display-name"
          onChange={e => {
            setDisplayName(e.target.value);
          }}
        />
        <div className="p-2 text-gray-500 italic">
          {`What's your name?`}
          <span className="text-gray-300"> (optional)</span>
        </div>
        <br />
        <input
          type="file"
          accept="image/*"
          className="edit-profile-file-input rounded placeholder-gray-400 bg-gray-50 w-72"
        />
        <div className="p-2 text-gray-500 italic">
          Select your profile picture
          <span className="text-gray-300"> (optional)</span>
        </div>
        <br />
        <input
          className="rounded placeholder-gray-400 bg-gray-50 w-48"
          type="text"
          placeholder="@twitter"
          value={twitter || ''}
          name="twitter"
          onChange={e => {
            setTwitter(e.target.value);
          }}
        />
        <div className="p-2 text-gray-500 italic">
          {`What's your twitter?`}
          <span className="text-gray-300"> (optional)</span>
        </div>
        <br />
        <input
          className="rounded placeholder-gray-400 bg-gray-50 w-72"
          type="email"
          placeholder="email@example.com"
          value={email || ''}
          name="email"
          onChange={e => {
            setEmail(e.target.value);
          }}
        />
        <div className="p-2 text-gray-500 italic">
          {`What's your email?`}
          <span className="text-gray-300"> (used for Gravatar)</span>
        </div>
        <div className="flex">
          <button
            onClick={submit}
            className="flex-grow mt-5 h-12 px-6 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600 mr-2"
          >
            Done
          </button>
          <button
            onClick={cancel}
            className="flex-none mt-5 h-12 px-6 text-lg text-black bg-gray-100 rounded-lg focus:shadow-outline active:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
