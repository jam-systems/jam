import {
  useAction,
  useUpdate,
  useState,
  useUnmount,
  declare,
  use,
} from '../../lib/state-tree';
import {is} from 'minimal-state';

export default function Recording({swarm}) {
  let recordingDestination = null;
  let recordedAudio = null;
  let isRecording = false;

  let mediaRecorder = null;
  let recordedChunks = null;
  let shouldDownload = false;
  let downloadFileName;
  let update = useUpdate();

  return function Recording({audioContext, myAudio, remoteStreams}) {
    let [isStart] = useAction('start-recording');
    let [isStop] = useAction('stop-recording');
    let [isDownload, fileName] = useAction('download-recording');

    if (isStart) {
      if (mediaRecorder !== null) {
        mediaRecorder.stop();
      }
      if (recordingDestination === null) {
        recordingDestination = audioContext.createMediaStreamDestination();
      }
      recordedChunks = [];
      recordedAudio = null;
      mediaRecorder = new MediaRecorder(recordingDestination.stream);
      isRecording = true;
      console.log('started media recorder', mediaRecorder);
      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        recordedAudio = new Blob(recordedChunks ?? [], {
          type: 'audio/mp3; codecs=opus',
        });
        update();
      };
      mediaRecorder.start();
    }

    if (isStop) {
      mediaRecorder?.stop();
      mediaRecorder = null;
      isRecording = false;
    }

    is(swarm.myPeerState, {isRecording});
    let isSomeoneRecording =
      use(swarm.peerState, state =>
        Object.values(state ?? {}).some(s => s?.isRecording)
      ) || isRecording;

    declare(RecordStream, {
      key: myAudio,
      stream: myAudio,
      audioContext,
      isRecording,
      recordingDestination,
    });

    for (let s of remoteStreams) {
      let {stream} = s;
      declare(RecordStream, {
        key: stream,
        stream,
        audioContext,
        isRecording,
        recordingDestination,
      });
    }

    if (isDownload) {
      shouldDownload = true;
      downloadFileName = fileName;
    }
    if (shouldDownload && recordedAudio?.size > 0) {
      shouldDownload = false;
      downloadMp3(downloadFileName, recordedAudio);
      downloadFileName = undefined;
    }

    return {recordedAudio, isRecording: isSomeoneRecording};
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
  a.download = `${fileName ?? 'recording'}.mp3`;
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
