import React, {useMemo} from 'react';
import {render} from 'react-dom';
import {useLocation} from './lib/use-location';
import Jam from './Jam';
import {parsePath, parseUrlConfig} from './lib/url-utils';

render(<App />, document.querySelector('#root'));

function App() {
  let {pathname, hash, search} = useLocation();

  const [route, dynamicConfig] = useMemo(() => {
    let {route, room} = parsePath(pathname);
    let config = parseUrlConfig(search, hash);
    config.room = {...room, ...(config.room ?? null)};
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
