import React, {useEffect, useMemo} from 'react';
import Modals from './views/Modal';
import state, {swarm} from './logic/state';
import {mergeClasses} from './lib/util';
import {debug, useSync} from './lib/state-utils';
import {staticConfig} from './logic/config';
import {useProvideWidth, WidthContext} from './lib/tailwind-mqp';
import {set, use} from 'use-minimal-state';
import Start from './views/Start';
import Me from './views/Me';
import PossibleRoom from './views/PossibleRoom';
import {debugStateTree, declare, declareStateRoot} from './lib/state-tree';
import {ShowAudioPlayerToast} from './views/AudioPlayerToast';
import {ExistingStateProvider} from './views/StateContext';
import {dispatchAppState} from './logic/main';

declareStateRoot(ShowModals, state);

export default function Jam({
  style,
  className,
  route = null,
  dynamicConfig = {},
  staticConfig: staticConfig_,
  ...props
}) {
  let roomId = null;

  // routing
  const View = (() => {
    switch (route) {
      case null:
        return <Start newRoom={dynamicConfig.room} />;
      case 'me':
        return <Me />;
      default:
        roomId = route;
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
  // set/unset room id
  useSync(state, {roomId}, [roomId]);

  // static config for cases where it can not be set by app server
  useMemo(() => {
    if (staticConfig_) set(staticConfig, staticConfig_);
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
      debugStateTree();
    }
  }, [dynamicConfig.debug]);

  // global styling
  // TODO: the color should depend on the loading state of GET /room, to not flash orange before being in the room
  // => color should be only set here if the route is not a room id, otherwise <PossibleRoom> should set it
  // => pass a setColor prop to PossibleRoom
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
      <ExistingStateProvider state={state} dispatch={dispatchAppState}>
        <WidthContext.Provider value={width}>
          {View}
          <Modals />
        </WidthContext.Provider>
      </ExistingStateProvider>
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
