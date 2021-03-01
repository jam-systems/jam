import React, {useEffect} from 'react';
import {render} from 'react-dom';
import Start from './views/Start.jsx';
import Room from './views/Room.jsx';
import './logic/main';
import identity, {initializeIdentity} from './logic/identity';
import {useApiQuery} from './logic/backend.js';
import {usePath} from './lib/use-location.js';
import {connectRoom} from './logic/room';
import swarm from './lib/swarm.js';
import Modals from './views/Modal.jsx';

render(<App />, document.querySelector('#root'));

function App() {
  // initialize identity
  useEffect(() => {
    initializeIdentity();
    swarm.config({myPeerId: identity.publicKey});
    swarm.set('sharedState', {inRoom: false});
  }, []);

  // detect roomId & connect to signalhub
  const [roomId] = usePath();
  useEffect(() => {
    if (roomId) {
      connectRoom(roomId);
      return () => swarm.disconnect();
    }
  }, [roomId]);
  // fetch room if we are in one
  let [room, isLoading] = useApiQuery(`/rooms/${roomId}`, !!roomId);

  let Main;

  if (roomId) {
    if (isLoading) Main = null;
    else if (room) Main = <Room room={room} roomId={roomId} />;
  }
  if (Main === undefined) Main = <Start urlRoomId={roomId} />;

  return (
    <>
      {Main}
      <Modals />
    </>
  );
}
