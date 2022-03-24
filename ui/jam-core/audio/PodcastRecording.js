// allows moderators to trigger a local recording in the browser of each speaker that is sent in chunks to the moderator

// shortcut: send audio chunks with the p2p events mechanism, same as how reactions are sent (via Websocket, client -> server -> client)
// TODO later: send audio chunks with RTCDataChannel via the WebRTC connection that is established anyway (client -> client)

// shortcut: automatically download a podcast track once it finished uploading
// TODO later: collect tracks (and their finished state) in web page; be flexible what to do with them
import {
  useAction,
  useUpdate,
  useState,
  useUnmount,
  declare,
  useEvent,
  useOn,
  useDispatch,
} from '../../lib/state-tree';
import {sendEventToOnePeer, sendPeerEvent} from '../../lib/swarm';
import {toBytes, toBase64} from 'fast-base64';

export default function PodcastRecording({swarm}) {
  // for speakers
  let localRecordings = {};

  // for podcaster
  let isPodcasting = false;
  let podcastChunks = {}; // {peerId: [chunk]}, chunk is some binary data representation
  let podcastTracks = {}; // {peerId: Blob}

  let update = useUpdate();

  useOn(swarm.peerEvent, 'podcast-chunk', async (peerId, chunk) => {
    if (!(peerId in podcastChunks)) podcastChunks[peerId] = [];
    chunk = await toBytes(chunk);
    podcastChunks[peerId].push(chunk);
  });
  useOn(swarm.peerEvent, 'podcast-chunk-end', peerId => {
    if (!(peerId in podcastChunks)) return;
    podcastTracks[peerId] = new Blob(podcastChunks[peerId], {
      type: 'audio/opus; codecs=opus',
    });
    delete podcastChunks[peerId];
    downloadMp3(`podcast-track-${peerId}`, podcastTracks[peerId]);
    update();
  });

  return function PodcastRecording({
    audioContext,
    myAudio,
    iAmSpeaker,
    iAmModerator,
    moderators,
  }) {
    // events to start/stop/cleanup local recording on speakers' client
    let [isPodcasterEvent, podcasterId, type] = useEvent(
      swarm.peerEvent,
      'podcaster'
    );
    if (isPodcasterEvent) {
      let isModerator = moderators?.includes(podcasterId);
      if (type === 'start' && isModerator) {
        localRecordings[podcasterId] = localRecordings[podcasterId] ?? {};
        localRecordings[podcasterId].state = 'start';
      } else if (type === 'stop') {
        localRecordings[podcasterId] = localRecordings[podcasterId] ?? {};
        localRecordings[podcasterId].state = 'stop';
      }
    }
    // triggered by LocalRecording to unmount itself after is has finished collected recorded audio
    let [isPodcastEnded, endedPodcasterId] = useAction('podcast-ended');
    if (isPodcastEnded) {
      delete localRecordings[endedPodcasterId];
    }
    let isSomeonePodcasting = Object.values(localRecordings).some(
      s => s.state === 'start'
    );
    // list of local recordings that are currently happening
    for (let peerId in localRecordings) {
      let recordingState = localRecordings[peerId].state;
      declare(LocalRecording, {
        key: peerId,
        podcasterId: peerId,
        swarm,
        myAudio,
        iAmSpeaker,
        recordingState,
        audioContext,
      });
    }

    // actions for the moderator who triggers podcast recording
    let [isStart] = useAction('start-podcast-recording');
    let [isStop] = useAction('stop-podcast-recording');

    // only moderators can start; if someone stops to be a moderator, stop the recording
    isStart = iAmModerator && isStart;
    isStop = isStop || (isPodcasting && !iAmModerator);

    if (isStart && !isStop && !isPodcasting) {
      isPodcasting = true;
      sendPeerEvent(swarm, 'podcaster', 'start');
    } else if (isStop && isPodcasting) {
      isPodcasting = false;
      sendPeerEvent(swarm, 'podcaster', 'stop');
    }

    return {podcastTracks, isPodcasting, isSomeonePodcasting};
  };
}

function LocalRecording({swarm, podcasterId}) {
  let isRecording = false;
  let mediaRecorder = null;
  let recordingDestination = null;
  let dispatch = useDispatch();

  return function LocalRecording({
    myAudio,
    iAmSpeaker,
    recordingState,
    audioContext,
  }) {
    let shouldRecord = recordingState === 'start' && iAmSpeaker;
    let isStart = shouldRecord && !isRecording;
    let isStop = !shouldRecord && isRecording;

    if (isStart) {
      if (mediaRecorder !== null) {
        mediaRecorder.stop();
      }
      if (recordingDestination === null) {
        recordingDestination = audioContext.createMediaStreamDestination();
      }
      mediaRecorder = new MediaRecorder(recordingDestination.stream);
      isRecording = true;
      console.log('started media recorder', mediaRecorder);
      mediaRecorder.ondataavailable = async event => {
        if (event.data.size > 0) {
          let chunk = await toBase64(
            new Uint8Array(await event.data.arrayBuffer())
          );
          sendEventToOnePeer(swarm, podcasterId, 'podcast-chunk', chunk);
        }
      };
      mediaRecorder.onstop = () => {
        // BAD HACK: wait another 100ms before sending the end signal.. to make sure that the last
        // recording chunk is sent before this, so the end of the recording doesn't get lost
        setTimeout(() => {
          sendEventToOnePeer(swarm, podcasterId, 'podcast-chunk-end');
          dispatch('podcast-ended', podcasterId);
        }, 100);
      };
      mediaRecorder.start(2000);
    }

    if (isStop) {
      mediaRecorder?.stop();
      mediaRecorder = null;
      isRecording = false;
    }

    declare(RecordStream, {
      key: myAudio,
      stream: myAudio,
      audioContext,
      isRecording,
      recordingDestination,
    });
  };
}

function RecordStream({
  stream,
  audioContext,
  isRecording,
  recordingDestination,
}) {
  let [sourceNode, setSourceNode] = useState(null);

  if (isRecording && sourceNode === null) {
    sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(recordingDestination);
    setSourceNode(sourceNode);
  }

  useUnmount(() => {
    sourceNode?.disconnect();
  });
}

function downloadMp3(fileName, blob) {
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  a.href = url;
  a.download = `${fileName ?? 'recording'}.opus`;
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
