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

const Video = ({stream}) => {
  const videoRef = React.createRef();

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream, videoRef]);

  return <video style={{height: 100, width: 100}} ref={videoRef} autoPlay />;
};

function App() {
  const [
    state,
    {createRoom, setProps, enterRoom, leaveRoom, addPresenter},
  ] = useJam();
  let [
    roomId,
    speaking,
    myId,
    inRoom,
    iAmSpeaker,
    peers,
    peerState,
    myVideo,
    remoteVideoStreams,
  ] = use(state, [
    'roomId',
    'speaking',
    'myId',
    'inRoom',
    'iAmSpeaker',
    'peers',
    'peerState',
    'myVideo',
    'remoteVideoStreams',
  ]);

  const myVideoRef = React.createRef();
  useEffect(() => {
    // Let's update the srcObject only after the ref has been set
    // and then every time the stream prop updates
    if (myVideoRef.current) myVideoRef.current.srcObject = myVideo;
  }, [myVideo, myVideoRef]);

  let hash = location.hash.slice(1) || null;
  let [potentialRoomId, setPotentialRoomId] = useState(hash);
  let nJoinedPeers = peers.filter(id => peerState[id]?.inRoom).length;

  function stream(e) {
    setProps({userInteracted: true});
    e.preventDefault();
    addPresenter(roomId, myId);
  }

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

  const videoElements = remoteVideoStreams.map(stream => (
    <Video stream={stream.stream} />
  ));

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
        <button onClick={stream} disabled={!inRoom}>
          Start Video
        </button>
      </form>
      <div>
        <b style={speaking.has(myId) ? {color: 'green'} : undefined}>
          {iAmSpeaker ? 'Speaking' : 'Not speaking'}
        </b>{' '}
        with <b>{nJoinedPeers}</b> other peer{nJoinedPeers === 1 ? '' : 's'}.
      </div>
      <div>
        <video
          style={{height: 100, width: 100, border: '1px solid black'}}
          ref={myVideoRef}
          autoPlay
        />
      </div>
      <div>
        <h3> Remote Videos </h3>
        {videoElements}
      </div>
    </>
  );
}
