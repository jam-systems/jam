import React, {useState} from 'react';
import {Modal} from './Modal';

export function InfoModal({roomId, room, close}) {

  let dismiss = () => {
    close();
  };

  return (
  <Modal close={close}>
    <div className="flex flex-row pt-4 pb-4">
      <div className="flex-1 text-gray-600 pt-6">
        Jam is an <span className="italic">audio&nbsp;space</span>
        <br />
        for chatting, brainstorming, debating, jamming,
        <br />
        micro-conferences and more.
        <br />
        <br />
        <a
        href="https://gitlab.com/jam-systems/jam"
        className="underline text-blue-800 active:text-blue-600"
        target="_blank"
        rel="noreferrer"
        >
        Learn&nbsp;more&nbsp;about&nbsp;Jam.
        </a>
        <br />
        <br />
        <br />
        Jam <b className="font-semibold">Pro</b> (Early Access): Make Jam
        your own.
        <br />
        Set your own colors and logo, use your own domain.
        <br />
        <br />
        <a
        href="https://pro.jam.systems"
        className="underline text-blue-800 active:text-blue-600"
        target="_blank"
        rel="noreferrer"
        >
        Sign up for the Jam Pro Early Access Program.
        </a>
      </div>
      <div className="flex-initial">
        <img
        className="mt-8 md:mt-4 md:mb-4 md:mr-8"
        style={{width: 130, height: 130}}
        alt="Jam mascot by @eejitlikeme"
        title="Jam mascot by @eejitlikeme"
        src="/img/jam.jpg"
        />
      </div>
    </div>


    <div className="hidden relative">
    <span
            style={{
            position: 'absolute',
            top: '-20px',
            right: '2px',
            fontSize: '13px',
            }}
        >
            Link copied to clipboard!
        </span>
        <button
        onClick={() => {
            if (navigator.share) {
            navigator.share({
                title: room.name || 'A Jam room',
                text: 'Hi, join me in this room on Jam.',
                url: (shareUrl ? shareUrl : location.href),
            });
            } else {
            copyToClipboard((shareUrl ? shareUrl : location.href));
            setShowShareInfo(true);
            setTimeout(() => setShowShareInfo(false), 2000);
            }
        }}
        className="ml-3 select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
        >share</button>
    </div>
  </Modal>
  );
}