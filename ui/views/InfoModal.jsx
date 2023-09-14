import React, {useState} from 'react';
import {Modal} from './Modal';

export function InfoModal({roomId, room, close}) {
  return (
    <Modal close={close}>
      <div className="flex flex-row pt-4 pb-4">
        <div className="flex-1 pt-6">
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
          Jam <b className="font-semibold">Pro</b> (Early Access): Make Jam your
          own.
          <br />
          DO I WORK Set your own colors and logo, use your own domain.
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

      {/* <div className="relative">
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
                url: shareUrl ? shareUrl : location.href,
              });
            } else {
              copyToClipboard(shareUrl ? shareUrl : location.href);
              setShowShareInfo(true);
              setTimeout(() => setShowShareInfo(false), 2000);
            }
          }}
          className="ml-3 select-none h-12 px-6 text-lg text-black bg-gray-200 rounded-lg focus:shadow-outline active:bg-gray-300"
        >
          share
        </button>
      </div> */}
    </Modal>
  );
}

// not sure we still need this
// share SVGs
// {/* heroicons/share-small */}
// {<svg
//   className="hidden"
//   xmlns="http://www.w3.org/2000/svg"
//   viewBox="0 0 20 20"
//   fill="currentColor"
// >
//   <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
// </svg>
// <svg
//   className="hidden"
//   viewBox="0 0 512 512"
//   xmlns="http://www.w3.org/2000/svg"
//   fill="currentColor"
// >
//   <g id="Solid">
//     <path d="m182.461 155.48 49.539-49.539v262.059a24 24 0 0 0 48 0v-262.059l49.539 49.539a24 24 0 1 0 33.941-33.941l-90.509-90.51a24 24 0 0 0 -33.942 0l-90.509 90.51a24 24 0 1 0 33.941 33.941z" />
//     <path d="m464 232a24 24 0 0 0 -24 24v184h-368v-184a24 24 0 0 0 -48 0v192a40 40 0 0 0 40 40h384a40 40 0 0 0 40-40v-192a24 24 0 0 0 -24-24z" />
//   </g>
// </svg>}
