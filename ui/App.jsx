import React, {createElement as h} from 'react';
import {render} from 'react-dom';
import {enterJamRoom, leaveJamRoom} from './main.js';

render(h(App), document.querySelector('#root'));

function App() {
  return (
    <div className="container">
      <div className="child">
        <h1>Reddit vs Hedge Funds</h1>

        <h3 style={{marginTop: '80px'}}>stage</h3>
        <table className="stage">
          <tr>
            <td>
              <img src="sonic.png" />
            </td>
            <td>
              <img src="tosh.jpg" />
            </td>
            <td className="speaking">
              <img src="sonic.png" />
            </td>
          </tr>
        </table>

        <h3 style={{marginTop: '80px'}}>audience</h3>
        <table className="audience">
          <tr>
            <td>
              <img src="sonic.png" />
            </td>
            <td>
              <img src="tosh.jpg" />
            </td>
            <td>
              <img src="sonic.png" />
            </td>
            <td>
              <img src="tosh.jpg" />
            </td>
          </tr>
        </table>

        <div className="navigation" style={{marginTop: '80px'}}>
          <button>🚪 Leave quietly</button>

          <button style={{float: 'right'}}>✋🏽 Raise hand</button>
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between'}}>
          <button onClick={enterJamRoom}>Enter Room</button>
          <button onClick={leaveJamRoom}>Leave Room</button>
        </div>
      </div>
    </div>
  );
}
