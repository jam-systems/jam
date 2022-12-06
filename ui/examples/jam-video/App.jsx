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

const videoContainerStyle = {
  height: '100px',
  width: '100px',
  borderRadius: '50px',
  position: 'absolute',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const SpeakerRing = ({peerId}) => {
  const [state] = useJam();
  let [speaking] = use(state, ['speaking']);
  const style = {
    left: 0,
    top: 0,
    position: 'absolute',
    width: '94px',
    height: '94px',
    border: `3px solid ${speaking.has(peerId) ? 'green' : 'transparent'}`,
    borderRadius: '50%',
    //zIndex: 100,
  };

  return <div style={style} />;
};

const Video = ({peerStream, x, y}) => {
  const style = {...videoContainerStyle, left: `${x}px`, top: `${y}px`};
  const {stream, peerId} = peerStream;
  const videoRef = React.createRef();
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream, videoRef]);

  return (
    <div style={style}>
      <video style={{height: '200px'}} ref={videoRef} autoPlay playsInline />
      <SpeakerRing peerId={peerId} />
    </div>
  );
};

function App() {
  const [
    state,
    {createRoom, setProps, enterRoom, leaveRoom, switchCamera},
  ] = useJam();
  let [
    roomId,
    myId,
    inRoom,
    peers,
    peerState,
    myVideo,
    remoteVideoStreams,
  ] = use(state, [
    'roomId',
    'myId',
    'inRoom',
    'peers',
    'peerState',
    'myVideo',
    'remoteVideoStreams',
  ]);

  let hash = location.hash.slice(1) || null;
  let [potentialRoomId, setPotentialRoomId] = useState(hash);
  const joinedPeers = peers.filter(id => peerState[id]?.inRoom);
  console.log('Joined Peers', joinedPeers);

  async function switchCam(e) {
    e.preventDefault();
    switchCamera();
  }

  function createRandomRoomId(e) {
    setProps({userInteracted: true});
    e.preventDefault();
    setPotentialRoomId(
      Math.abs((Math.random() * 16 ** 8) | 0)
        .toString(16)
        .padStart(8, '0')
    );
  }

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

  const allParticipants = [
    ...joinedPeers.map(
      peerId => remoteVideoStreams.find(s => s.peerId === peerId) || {peerId}
    ),
    {peerId: myId, stream: myVideo},
  ];

  const sortedParticipants = allParticipants.sort(function (a, b) {
    return a.peerId.localeCompare(b.peerId);
  });

  const videoElements = sortedParticipants.map((stream, n) => {
    const radius = 150;
    const count = sortedParticipants.length;
    const angle = (Math.PI * 2) / count;
    const x = 150 + radius * Math.sin(angle * n);
    const y = 150 + radius * Math.cos(angle * n);

    return <Video peerStream={stream} x={x} y={y} />;
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
        {!inRoom && (
          <button onClick={createRandomRoomId}>Create random room</button>
        )}
        {inRoom && <button onClick={switchCam}>Switch camera</button>}
      </form>
      {inRoom && (
        <div style={{width: '300px', height: '300px', position: 'relative'}}>
          {videoElements}
        </div>
      )}
    </>
  );
}
