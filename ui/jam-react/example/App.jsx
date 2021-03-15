import React from 'react';
import {render} from 'react-dom';
import Jam from '../index.jsx';

render(<App />, document.getElementById('root'));

function App() {
  return (
    <div>
      <h1>My own Clubhouse!!!!</h1>
      <Jam roomId="klubhaus" />
    </div>
  );
}
