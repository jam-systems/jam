import React, {useState} from 'react';
import slugify from 'slugify';

import {createRoom} from '../backend';
import swarm from '../lib/swarm.js';
import {navigate} from '../lib/use-location';
import {createAudioContext, enterRoom} from '../main';

export default function Start({urlRoomId}) {
  let [name, setName] = useState('');
  let [description, setDescription] = useState('');

  let submit = e => {
    e.preventDefault();
    let roomId;
    if (name) {
      let slug = slugify(name, {lower: true, strict: true});
      roomId = slug + '-' + Math.random().toString(36).substr(2, 4);
    } else {
      roomId = Math.random().toString(36).substr(2, 6);
    }

    // createAudioContext();
    (async () => {
      await createRoom(roomId, name, description, swarm.myPeerId);
      if (urlRoomId !== roomId) navigate('/' + roomId);
      enterRoom(roomId);
    })();
  };

  let humins = ["DoubleMalt", "mitschabaude", "__tosh"];
  humins = humins.sort(() => Math.random() - 0.5);

  return (
    <div className="container">
      <div className="child p-6 md:p-10">
        <h1>Welcome to Jam</h1>

        <div className="flex flex-row pt-4 pb-4">
          <div className="flex-1 text-gray-600 pt-6">
            Jam is an <span className="italic">audio&nbsp;space</span>
            <br />
            for chatting, brainstorming, debating, jamming,<br />
            micro-conferences
            and more.
            <br />
            <br />
            <a href="/" className="underline text-blue-800 active:text-blue-600">
              Learn&nbsp;more&nbsp;about&nbsp;Jam.
            </a>
          </div>
          <div className="flex-initial">
            <img
              className="mt-8 md:mt-4 md:mb-4 md:mr-8"
              style={{width: 130, height: 130}}
              alt="Jam mascot by @eejitlikeme"
              title="Jam mascot by @eejitlikeme"
              src="/img/jam-illustration.png"
            />
          </div>
        </div>

        <hr />

        <br />
        <br />

        <form onSubmit={submit}>
          <input
            className="rounded placeholder-gray-300 bg-gray-50 w-64"
            type="text"
            placeholder="Room topic"
            value={name}
            name="jam-room-topic"
            autoComplete="off"
            onChange={e => {
              setName(e.target.value);
            }}
          ></input>
          <div className="p-2 text-gray-500 italic">
            Pick a topic to talk about.{' '}
            <span className="text-gray-300">(optional)</span>
          </div>
          <br />
          <input
            className="rounded placeholder-gray-300 bg-gray-50 w-72 md:w-96"
            type="text"
            placeholder="Room description"
            value={description}
            name="jam-room-description"
            autoComplete="off"
            onChange={e => {
              setDescription(e.target.value);
            }}
          ></input>
          <div className="p-2 text-gray-500 italic">
            Describe what this room is about.{' '}
            <span className="text-gray-300">(optional)</span>
          </div>

          {/* <input
            className="hidden"
            type="text"
            placeholder={randomId}
            value={customId}
            onChange={e => {
              setRoomId(e.target.value);
            }}
          ></input> */}

          <button
            onClick={submit}
            className="select-none mt-5 h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
          >
            🌱 Start room
          </button>
        </form>
        <div className="pt-32 text-xs text-gray-300 text-center">
          <a href="https://gitlab.com/jam-systems/jam" target="_blank">built</a> w/ ♥ by {humins.map((humin, idx) => (<span key={idx}> <a href={"https://twitter.com/" + humin} target="_blank">@{humin}</a></span>))} in Berlin &amp; Vienna, <a href="https://www.digitalocean.com" target="_blank">hosted in Frankfurt</a>
        </div>
      </div>
    </div>
  );
}
