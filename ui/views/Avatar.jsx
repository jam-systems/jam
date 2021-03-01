import React, {useEffect, useState} from 'react';
import {avatarUrl} from '../lib/avatar';
import animateEmoji from '../lib/animate-emoji';

const reactionEmojis = ['❤️', '💯', '😂', '😅', '😳', '🤔'];

export function StageAvatar({
  speaking,
  moderators,
  peerId,
  peerState,
  reactions,
  info,
  onClick,
}) {
  let {micMuted, inRoom = null} = peerState || {};
  let reactions_ = reactions[peerId];
  info = info || {id: peerId};
  let isSpeaking = speaking.has(peerId);
  let isModerator = moderators.includes(peerId);
  return (
    inRoom && (
      <li
        key={peerId}
        title={info.displayName}
        className="relative items-center space-y-1 mt-4 ml-2 mr-2"
        style={onClick ? {cursor: 'pointer'} : undefined}
      >
        <div
          className={
            isSpeaking
              ? 'human-radius p-1 bg-gray-300'
              : 'human-radius p-1 bg-white'
          }
        >
          <div className="human-radius p-1 bg-white relative flex justify-center">
            <img
              className="human-radius border border-gray-300 bg-yellow-50 w-20 h-20 md:w-28 md:h-28 object-cover"
              alt={info.displayName}
              src={avatarUrl(info)}
              onClick={onClick}
            />
            <Reactions
              reactions={reactions_}
              className="absolute bg-white text-5xl md:text-7xl pt-4 md:pt-5 human-radius w-20 h-20 md:w-28 md:h-28 border text-center"
            />
          </div>
        </div>
        {/* div for showing mute/unmute status */}
        <div className={micMuted ? '' : 'hidden'}>
          <div className="absolute w-10 h-10 right-0 top-12 md:top-20 rounded-full bg-white border-2 text-2xl border-gray-400 flex items-center justify-center">
            🙊
          </div>
        </div>
        <div className="w-20 md:w-28 m-2">
          <div className="flex">
            <div className="flex-none text-center pl-1 w-20 md:w-28">
              <span className="text-sm md:text-base whitespace-nowrap w-22 md:w-30 text-black font-medium">
                <span
                  style={{margin: '0 3px 0 -4px'}}
                  className={
                    isModerator
                      ? 'flex-none inline-block leading-3 bg-gray-600 text-white w-3 h-3 rounded-full -ml-3'
                      : 'hidden'
                  }
                >
                  <svg
                    className="inline-block w-2 h-2"
                    style={{margin: '-3px 0 0 0'}}
                    x="0px"
                    y="0px"
                    viewBox="0 0 1000 1000"
                    enableBackground="new 0 0 1000 1000"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M894.5,633.4L663.3,500l231.1-133.4c39.1-22.6,52.4-72.5,29.9-111.6c-22.6-39.1-72.5-52.4-111.6-29.9L581.7,358.5V91.7c0-45.1-36.6-81.7-81.7-81.7c-45.1,0-81.7,36.6-81.7,81.7v266.9L187.2,225.1c-39.1-22.6-89-9.2-111.6,29.9c-22.6,39.1-9.2,89,29.9,111.6L336.7,500L105.5,633.4C66.5,656,53.1,705.9,75.6,745c22.6,39.1,72.5,52.4,111.6,29.9l231.1-133.4v266.9c0,45.1,36.6,81.7,81.7,81.7c45.1,0,81.7-36.6,81.7-81.7V641.5l231.1,133.4c39.1,22.6,89,9.2,111.6-29.9C946.9,705.9,933.5,656,894.5,633.4z" />
                  </svg>
                </span>
                {info.displayName?.substring(0, 12)}
              </span>
              <TwitterHandle
                info={info}
                divClass="text-center"
                fontClass="text-sm"
              />
            </div>
          </div>
        </div>
      </li>
    )
  );
}

export function AudienceAvatar({peerId, peerState, reactions, info, onClick}) {
  let {inRoom = null} = peerState || {};
  let reactions_ = reactions[peerId];
  info = info || {id: peerId};
  return (
    inRoom && (
      <li
        title={info.displayName}
        className="flex-none m-2 w-16 h-32 md:w-24 md:h-36 text-xs"
        style={onClick ? {cursor: 'pointer'} : undefined}
      >
        <div className="relative flex justify-center">
          <img
            className="human-radius w-16 h-16 md:w-24 md:h-24 border border-gray-300 bg-yellow-50 object-cover"
            alt={info.displayName}
            src={avatarUrl(info)}
            onClick={onClick}
          />
          <Reactions
            reactions={reactions_}
            className="absolute bg-white text-4xl md:text-6xl pt-3 md:pt-4 human-radius w-16 h-16 md:w-24 md:h-24 border text-center"
          />
        </div>
        <div className="overflow-hidden whitespace-nowrap text-center mt-2">
          {info.displayName}
        </div>
        <TwitterHandle
          info={info}
          divClass="text-center mt-1"
          fontClass="text-xs"
        />
      </li>
    )
  );
}

function TwitterHandle({info, divClass, fontClass}) {
  let twitterIdentity = info?.identities?.filter((identity) => identity.type === 'twitter').length > 0 ?
      info?.identities?.filter((identity) => identity.type === 'twitter')[0] :
      undefined
  return (
    (twitterIdentity.id || null) && (
      <div className={divClass}>
        <span className={fontClass}>
          {/* <span className="text-gray-800">@</span> */}
          <a
            className="text-gray-500 font-medium ml-1"
            style={{textDecoration: 'none', fontWeight: 'normal'}}
            href={'https://twitter.com/' + twitterIdentity.id.substring(1)}
            target="_blank"
            rel="noreferrer"
          >
            {twitterIdentity.id}
          </a>
        </span>
      </div>
    )
  );
}

function Reactions({reactions, className}) {
  if (!reactions) return null;
  return (
    <>
      {reactions.map(
        ([r, id]) =>
          reactionEmojis.includes(r) && (
            <AnimatedEmoji
              key={id}
              emoji={r}
              className={className}
              style={{
                alignSelf: 'center',
              }}
            />
          )
      )}
    </>
  );
}

function AnimatedEmoji({emoji, ...props}) {
  let [element, setElement] = useState(null);
  useEffect(() => {
    if (element) animateEmoji(element);
  }, [element]);
  return (
    <div ref={setElement} {...props}>
      {emoji}
    </div>
  );
}
