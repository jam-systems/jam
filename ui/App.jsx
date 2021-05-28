import React, {useMemo} from 'react';
import {render} from 'react-dom';
import {useLocation} from './lib/use-location';
import Jam from './Jam';
import {parsePath, parseUrlConfig} from './lib/url-utils';
import {jamSetup} from './logic/main';

jamSetup({
  cachedRooms: window.existingRoomInfo && {
    [window.existingRoomId]: window.existingRoomInfo,
  },
});

render(<App />, document.querySelector('#root'));

function App() {
  // TODO: react on hash changes that don't affect route
  let {pathname, hash, search} = useLocation();

  const [route, dynamicConfig] = useMemo(() => {
    let {route, room} = parsePath(pathname);
    let config = parseUrlConfig(search, hash);
    config.room = {...(config.room ?? null), ...room};
    return [route, config];
  }, [pathname, hash, search]);

  return (
    <Jam
      style={{height: '100vh'}}
      route={route}
      dynamicConfig={dynamicConfig}
    />
  );
}
