import React, {useState, useEffect} from 'react';
import {render} from 'react-dom';
import {JamProvider, useJam, use} from 'jam-core-react';

const jamConfig = {
  domain: 'beta.jam.systems',
  development: true,
  sfu: true,
};

render(
  <JamProvider options={{jamConfig}}>
    <App />
  </JamProvider>,
  document.querySelector('#root')
);

function App() {
  const [
    state,
    {createRoom, setProps, enterRoom, leaveRoom, selectMicrophone},
  ] = useJam();
  let [
    roomId,
    speaking,
    myId,
    inRoom,
    iAmSpeaker,
    peers,
    peerState,
    availableMicrophones,
  ] = use(state, [
    'roomId',
    'speaking',
    'myId',
    'inRoom',
    'iAmSpeaker',
    'peers',
    'peerState',
    'availableMicrophones',
  ]);

  let hash = location.hash.slice(1) || null;
  let [potentialRoomId, setPotentialRoomId] = useState(hash);
  let nJoinedPeers = peers.filter(id => peerState[id]?.inRoom).length;

  function submit(e) {
    setProps({userInteracted: true});
    e.preventDefault();
    if (state.inRoom) {
      leaveRoom();
      setProps('roomId', null);
    } else {
      createRoom(potentialRoomId, {stageOnly: true});
      setProps('roomId', potentialRoomId);
      enterRoom(potentialRoomId);
      location.hash = potentialRoomId;
    }
  }

  useEffect(() => {
    let hashChange = () => {
      let hash = location.hash.slice(1) || null;
      if (hash !== state.roomId) {
        setPotentialRoomId(hash);
        setProps('roomId', null);
      }
    };
    window.addEventListener('hashchange', hashChange);
    return () => {
      window.removeEventListener('hashchange', hashChange);
    };
  }, [setProps, state]);

  return (
    <>
      <form onSubmit={submit} style={{marginBottom: '4px'}}>
        <input
          type="text"
          placeholder="Room ID"
          style={{width: '145px'}}
          value={potentialRoomId ?? ''}
          onChange={e => setPotentialRoomId(e.target.value || null)}
          disabled={!!roomId}
        />
        <button onClick={submit} disabled={!(potentialRoomId?.length > 3)}>
          {inRoom ? 'Leave' : 'Join'}
        </button>
      </form>
      <div>
        <b style={speaking.has(myId) ? {color: 'green'} : undefined}>
          {iAmSpeaker ? 'Speaking' : 'Not speaking'}
        </b>{' '}
        with <b>{nJoinedPeers}</b> other peer{nJoinedPeers === 1 ? '' : 's'}.
      </div>
      <div>
        {availableMicrophones.map(mic => {
          return (
            <button onClick={() => selectMicrophone(mic)} key={mic.deviceId}>
              {mic.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
