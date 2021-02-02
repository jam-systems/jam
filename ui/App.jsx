import React from 'react';
import {render} from 'react-dom';
import Start from './views/Start.jsx';
import Room from './views/Room.jsx';
import NewRoom from './views/NewRoom.jsx';

render(<App />, document.querySelector('#root'));

function App() {
  const [roomId] = location.pathname.split('/').filter(x => x);
  if(roomId) {
    return <Room />
  } else {
    return <Start />
  }
}
