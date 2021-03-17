import React from 'react';
import {render} from 'react-dom';
import Jam from '../index.jsx';

render(<App />, document.getElementById('root'));

function App() {
  let ids = ['01', '02', '03'];
  return (
    <div style={{padding: '1rem'}}>
      <h1>Jam: My own Clubhouse!!!!</h1>
      <div>
        {ids.map(id => (
          <Jam
            key={id}
            jamUrl="http://beta.jam.systems"
            roomId={`klubhaus-${id}`}
            newRoom={{
              name: 'A new Jam Room',
              description: 'This Room was created by a React component',
              color: '#000000',
            }}
            style={{width: '400px', height: '600px'}}
          />
        ))}
      </div>
    </div>
  );
}
