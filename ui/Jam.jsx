import React, {useEffect, useMemo} from 'react';
import {currentId} from './logic/identity';
import {initializeIdentity} from './logic/backend';
import Modals from './views/Modal';
import state, {swarm} from './logic/state';
import {mergeClasses} from './logic/util';
import {debug} from './lib/state-utils';
import {staticConfig} from './logic/config';
import {useProvideWidth, WidthContext} from './logic/tailwind-mqp';
import {set, use} from 'use-minimal-state';
import Start from './views/Start';
import Me from './views/Me';
import PossibleRoom from './views/PossibleRoom';
import {declare, declareStateRoot} from './lib/state-tree';
import {ShowAudioPlayerToast} from './views/AudioPlayerToast';

declareStateRoot(ShowModals, state);

export default function Jam({
  style,
  className,
  route = null,
  dynamicConfig = {},
  staticConfig: staticConfig_,
  ...props
}) {
  // routing
  const View = (() => {
    switch (route) {
      case null:
        return <Start />;
      case 'me':
        return <Me />;
      default:
        return (
          <PossibleRoom
            roomId={route}
            newRoom={dynamicConfig.room}
            roomIdentity={dynamicConfig.identity}
            roomIdentityKeys={dynamicConfig.keys}
            onError={({error}) => (
              <Start urlRoomId={route} roomFromURIError={!!error.createRoom} />
            )}
          />
        );
    }
  })();

  // static config for cases where it can not be set by app server
  useMemo(() => {
    if (staticConfig_) set(staticConfig, staticConfig_);
  }, []);

  // initialize identity, swarm
  useEffect(() => {
    initializeIdentity();
    swarm.config({myPeerId: currentId()});
    set(swarm.myPeerState, {inRoom: false, micMuted: false});
  }, []);

  // toggle debugging
  useEffect(() => {
    if (dynamicConfig.debug) {
      window.DEBUG = true;
      debug(swarm);
    }
    if (dynamicConfig.debug || staticConfig.development) {
      window.swarm = swarm;
      window.state = state;
      debug(state);
    }
  }, [dynamicConfig.debug]);

  // global styling
  let {color} = use(state, 'room');
  let [width, , setContainer, mqp] = useProvideWidth();
  let backgroundColor = useMemo(
    () => (color && color !== '#4B5563' ? hexToRGB(color, '0.123') : undefined),
    [color]
  );

  return (
    <div
      ref={el => setContainer(el)}
      className={mqp(mergeClasses('jam sm:pt-12', className), width)}
      style={{
        position: 'relative',
        height: '100%',
        minHeight: '-webkit-fill-available',
        backgroundColor,
        ...(style || null),
      }}
      {...props}
    >
      <WidthContext.Provider value={width}>
        {View}
        <Modals />
      </WidthContext.Provider>
    </div>
  );
}

function hexToRGB(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (alpha) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else {
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function ShowModals() {
  declare(ShowAudioPlayerToast);
}
