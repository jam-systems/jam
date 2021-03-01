import React, {useState} from 'react';
import SparkMD5 from 'spark-md5';
import swarm from '../lib/swarm';
import {Modal} from './Modal';
import identity, {updateInfoServer} from '../identity';
import {use} from 'use-minimal-state';

let updateInfo = async info => {
  if (info.twitter) {
    let twitter = info.twitter.trim();
    if (!twitter.includes('@')) twitter = '@' + twitter;
    info.twitter = twitter;
  }
  let newInfo = {...identity.info, ...info};
  let ok = await updateInfoServer(newInfo);
  if (ok) {
    identity.set('info', newInfo);
    swarm.hub.broadcast('identity-updates', {});
  }
};

export default function EditIdentity({close}) {
  let [info, id] = use(identity, ['info', 'publicKey']);
  let [displayName, setDisplayName] = useState(info?.displayName);
  let [email, setEmail] = useState(info?.email);
  let [twitter, setTwitter] = useState(info?.twitter);
  let [tweetInput, setTweetInput] = useState(info?.tweet);
  let tweet = info?.tweet;

  let emailHash = email ? SparkMD5.hash(email) : info?.emailHash;

  const [showTwitterVerify, setShowTwitterVerify] = useState(false);

  let submit = e => {
    let tweet = tweetInput;
    console.log('submitting tweet', tweet);

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
        updateInfo({displayName, twitter, tweet, emailHash, avatar});
      };
    }
    e.preventDefault();
    updateInfo({displayName, twitter, tweet, emailHash});
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
          Set your profile picture
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
        <span className="text-gray-500">
          {/* heroicons/fingerprint */}
          <svg
            className={
              tweet
                ? 'text-blue-600 pl-2 mr-1 h-6 w-6 inline-block'
                : 'pl-2 mr-1 h-6 w-6 inline-block'
            }
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
            />
          </svg>
          <span>
            <span
              className={tweet ? 'hidden' : 'underline'}
              style={{cursor: 'pointer'}}
              onClick={() => setShowTwitterVerify(!showTwitterVerify)}
            >
              verify
            </span>
            <span
              className={tweet ? '' : 'hidden'}
              onClick={() => setShowTwitterVerify(!showTwitterVerify)}
            >
              verified
            </span>
          </span>
        </span>

        <div className="p-2 text-gray-500 italic">
          {`Set your twitter user name`}
          <span className="text-gray-300"> (optional)</span>
          <br />
        </div>

        <div
          className={showTwitterVerify ? 'p-2 text-gray-500 italic' : 'hidden'}
        >
          <p>
            <a
              className="underline not-italic text-blue-600 hover:text-blue-800 visited:text-purple-600"
              href={
                'https://twitter.com/intent/tweet?text=' +
                encodeURI('did:i:') +
                id +
                '%0a%0aThis is my public key on 🍞 Jam%0a%0a(@jam_systems // https://jam.systems)'
              }
              target="_blank"
              rel="noreferrer"
            >
              Tweet your Jam public key
            </a>
            <br />
            to verify your twitter account
          </p>
          <pre
            style={{fontSize: '0.7rem'}}
            className="rounded-md bg-yellow-50 not-italic text-xs text-center py-2 -ml-2 mt-2 md:text-base"
          >
            {id}
          </pre>

          <input
            className="tweet mt-2 -ml-2 rounded placeholder-gray-400 bg-gray-50 w-72"
            type="text"
            placeholder="Tweet URL"
            name="tweet"
            value={tweetInput}
            onChange={e => setTweetInput(e.target.value)}
          />
        </div>

        <br />
        <hr />
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
