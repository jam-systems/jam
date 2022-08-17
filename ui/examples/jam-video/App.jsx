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

const videoStyle = {
  height: '100px',
  width: '100px',
  borderRadius: '50px',
  border: '3px solid red',
  position: 'absolute',
};

const Video = ({stream, x, y}) => {
  const style = {...videoStyle, left: `${x}px`, top: `${y}px`};

  if (stream) {
    const videoRef = React.createRef();

    useEffect(() => {
      if (videoRef.current) videoRef.current.srcObject = stream;
    }, [stream, videoRef]);

    return <video style={style} ref={videoRef} autoPlay />;
  } else {
    return <div style={style}>NP</div>;
  }
};

function App() {
  const [state, {createRoom, setProps, enterRoom, leaveRoom}] = useJam();
  let [
    roomId,
    speaking,
    myId,
    inRoom,
    iAmSpeaker,
    iAmPresenter,
    peers,
    peerState,
    myVideo,
    remoteVideoStreams,
    room,
  ] = use(state, [
    'roomId',
    'speaking',
    'myId',
    'inRoom',
    'iAmSpeaker',
    'iAmPresenter',
    'peers',
    'peerState',
    'myVideo',
    'remoteVideoStreams',
    'room',
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
      createRoom(potentialRoomId, {stageOnly: true, videoCall: true});
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

  const allVideoStreams = [
    ...remoteVideoStreams,
    {peerId: myId, stream: myVideo},
  ].sort(function (a, b) {
    return a.peerId.localeCompare(b.peerId);
  });

  const videoElements = allVideoStreams.map((stream, n) => {
    const radius = 150;

    const count = allVideoStreams.length;

    const angle = (Math.PI * 2) / count;

    const x = 150 + radius * Math.sin(angle * n);
    const y = 150 + radius * Math.cos(angle * n);

    console.log(count, angle, x, y);

    return <Video stream={stream.stream} x={x} y={y} />;
  });

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
        </b>
        and
        <b>{iAmPresenter ? 'Presenting' : 'Not presenting'}</b> with{' '}
        <b>{nJoinedPeers}</b> other peer{nJoinedPeers === 1 ? '' : 's'}.
      </div>
      {inRoom && (
        <div style={{width: '300px', height: '300px', position: 'relative'}}>
          {videoElements}
        </div>
      )}
    </>
  );
}
