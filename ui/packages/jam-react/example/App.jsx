import React, {useState} from 'react';
import {render} from 'react-dom';
import Jam from '../dist/index.js';

render(<App />, document.getElementById('root'));

function App() {
  let [nameInput, setNameInput] = useState('Gregor');
  let [name, setName] = useState('Gregor');
  let submit = e => {
    e.preventDefault();
    setName(nameInput);
  };
  return (
    <div style={{padding: '1rem'}}>
      <h1>Jam: My own Clubhouse!</h1>
      <form onSubmit={submit}>
        <label>
          Name:
          <input
            type="test"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
          />
        </label>
        <input value="OK" type="submit" onSubmit={submit} />
      </form>
      <div style={{height: '1rem'}} />
      <div>
        <Jam
          jamUrl="http://beta.jam.systems"
          roomId="klubhaus-123456"
          params={{
            room: {
              name: 'A new Jam Room',
              description: 'This Room was created by a React component',
              color: '#000000',
              stageOnly: true,
            },
            ux: {
              autoCreate: false,
              autoRejoin: true,
            },
            identity: {
              name,
              avatar: 'https://avatars.githubusercontent.com/u/20989968',
            },
            // debug: true,
          }}
          style={{width: '400px', height: '600px', border: 'none'}}
        />
      </div>
    </div>
  );
}
