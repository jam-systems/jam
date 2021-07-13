import React, {useEffect, useMemo} from 'react';
import Modals from './views/Modal';
import {mergeClasses} from './lib/util';
import {debug} from './lib/state-utils';
import {useProvideWidth, WidthContext} from './lib/tailwind-mqp';
import {use} from 'use-minimal-state';
import Start from './views/Start';
import Me from './views/Me';
import PossibleRoom from './views/PossibleRoom';
import {declare, declareStateRoot} from './lib/state-tree';
import {ShowAudioPlayerToast} from './views/AudioPlayerToast';
import {JamProvider, useJam} from './jam-core-react';
import {createJam} from './jam-core';
import {ShowInteractionModal} from './views/InteractionModal';

const [state, api] = createJam({
  jamConfig: window.jamConfig,
  initialProps: {roomId: window.existingRoomId ?? null},
  cachedRooms: window.existingRoomInfo && {
    [window.existingRoomId]: window.existingRoomInfo,
  },
});

declareStateRoot(ShowModals, null, {state});

export default function Jam(props) {
  return (
    <JamProvider state={state} api={api}>
      <JamUI {...props} />
    </JamProvider>
  );
}

function JamUI({style, className, route = null, dynamicConfig = {}, ...props}) {
  const [state, {setProps}] = useJam();

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
            autoCreate={!!dynamicConfig.ux?.autoCreate}
            roomIdentity={dynamicConfig.identity}
            roomIdentityKeys={dynamicConfig.keys}
            uxConfig={dynamicConfig.ux ?? emptyObject}
            onError={({error}) => (
              <Start
                urlRoomId={route}
                roomFromURIError={!!error.createRoom}
                newRoom={dynamicConfig.room}
              />
            )}
          />
        );
    }
  })();

  // set/unset room id
  useEffect(() => {
    let {autoJoin, autoRejoin} = dynamicConfig.ux ?? {};
    if (autoJoin !== undefined) {
      setProps('autoJoin', !!autoJoin);
    }
    if (autoRejoin !== undefined) {
      setProps('autoRejoin', !!autoRejoin);
    }
    setProps('roomId', roomId);
  }, [roomId, dynamicConfig.ux, setProps]);

  // toggle debugging
  useEffect(() => {
    if (dynamicConfig.debug) {
      window.DEBUG = true;
      debug(state.swarm);
    }
  }, [dynamicConfig.debug, state]);

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
      <WidthContext.Provider value={width}>
        {View}
        <Modals />
      </WidthContext.Provider>
    </div>
  );
}

const emptyObject = {};

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
  declare(ShowInteractionModal);
}
