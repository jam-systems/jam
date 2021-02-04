import React, {useState} from 'react';
import {render} from 'react-dom';
import Start from './views/Start.jsx';
import Room from './views/Room.jsx';
import {useIsRoomNew} from './backend.js';
import {useLocation} from './lib/use-location.js';

render(<App />, document.querySelector('#root'));

function App() {
  useLocation();
  const [roomId] = location.pathname.split('/').filter(x => x);
  let [doDisplayRoom, setDoDisplayRoom] = useState(false);
  let displayRoom = () => setDoDisplayRoom(true);
  let [isNew, isLoading] = useIsRoomNew(roomId, !doDisplayRoom);
  if (roomId) {
    if (isLoading) return null;
    return isNew && !doDisplayRoom ? (
      <Start urlRoomId={roomId} displayRoom={displayRoom} />
    ) : (
      <Room roomId={roomId} />
    );
  } else {
    return <Start displayRoom={displayRoom} />;
  }
}
