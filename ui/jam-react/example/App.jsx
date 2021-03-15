import React from 'react';
import {render} from 'react-dom';
import Jam from '../index.jsx';

render(<App />, document.getElementById('root'));

function App() {
  return (
    <div>
      <h1>My own Clubhouse!!!!</h1>
      <Jam
        roomId="klubhaus-123"
        newRoom={{
          name: 'A new Klubhaus Room',
          color: '#000000',
        }}
        style={{width: '500px', height: '600px'}}
      />
    </div>
  );
}
