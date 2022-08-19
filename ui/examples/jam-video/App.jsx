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
  border: '3px solid red',
  position: 'absolute',
  overflow: 'hidden',
};

const Video = ({stream, x, y}) => {
  const style = {...videoContainerStyle, left: `${x}px`, top: `${y}px`};

  if (stream) {
    const videoRef = React.createRef();

    useEffect(() => {
      if (videoRef.current) videoRef.current.srcObject = stream;
    }, [stream, videoRef]);

    const videoSize = 200;

    const videoHeight = stream.getVideoTracks()[0].getSettings().height;
    const videoWidth = stream.getVideoTracks()[0].getSettings().width;
    const videoAspectRatio = stream.getVideoTracks()[0].getSettings()
      .aspectRatio;

    let videoStyle = {};

    if (videoWidth > videoHeight) {
      videoStyle.height = `${videoSize}px`;
      videoStyle.marginTop = `-${(videoSize - 100) / 2}px`;
      videoStyle.marginLeft = `-${(videoSize * videoAspectRatio) / 2 - 50}px`;
    }

    return (
      <div style={style}>
        <video style={videoStyle} ref={videoRef} autoPlay />
      </div>
    );
  } else {
    return <div style={style}>NP</div>;
  }
};

function App() {
  const [
    state,
    {createRoom, setProps, enterRoom, leaveRoom, switchCamera},
  ] = useJam();
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
  const joinedPeers = peers.filter(id => peerState[id]?.inRoom);
  console.log('Joined Peers', joinedPeers);
  let nJoinedPeers = joinedPeers.length;

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
        {!inRoom && (
          <button onClick={createRandomRoomId}>Create random room</button>
        )}
        {inRoom && <button onClick={switchCam}>Switch camera</button>}
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
