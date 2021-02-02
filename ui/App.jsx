import React from 'react';
import {render} from 'react-dom';
import Start from './views/Start.jsx';
import Room from './views/Room.jsx';
import NewRoom from './views/NewRoom.jsx';
import {useIsRoomNew} from './backend.js';

render(<App />, document.querySelector('#root'));

function App() {
  const [roomId] = location.pathname.split('/').filter(x => x);
  let [isNew, isLoading] = useIsRoomNew(roomId);
  if (roomId) {
    if (isLoading) return null;
    // TODO: create room
    // return isNew ? <NewRoom /> : <Room />;
    return <Room />;
  } else {
    return <Start />;
  }
}
