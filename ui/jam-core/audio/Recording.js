import {useAction, useUpdate} from '../../lib/state-tree';
import {useDidChange} from '../../lib/state-utils';

export default function Recording() {
  let recordedAudio = null;
  let isRecording = false;

  let mediaRecorder = null;
  let recordedChunks = null;
  let shouldDownload = false;
  let downloadFileName;
  let update = useUpdate();

  function collectRecording() {
    if (recordedChunks === null) return;
    recordedAudio = new Blob(recordedChunks, {type: 'audio/mp3; codecs=opus'});
  }

  function download(fileName) {
    if (recordedAudio === null) {
      if (recordedChunks === null) return;
      collectRecording();
    }
    let url = URL.createObjectURL(recordedAudio);
    let a = document.createElement('a');
    document.body.appendChild(a);
    a.style = 'display: none';
    a.href = url;
    a.download = `${fileName ?? 'recording'}.mp3`;
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  return function Recording({myAudio}) {
    let [isStart] = useAction('start-recording');
    let [isStop] = useAction('stop-recording');

    let [isDownload, fileName] = useAction('download-recording');
    let audioChanged = useDidChange(myAudio);

    if (isStart && myAudio) {
      if (mediaRecorder !== null) {
        mediaRecorder.stop();
      }
      recordedChunks = [];
      recordedAudio = null;
      mediaRecorder = new MediaRecorder(myAudio);
      isRecording = true;
      console.log('started media recorder', mediaRecorder);
      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        collectRecording();
        update();
      };
      mediaRecorder.start();
    } else if (audioChanged && mediaRecorder !== null) {
      // TODO merge recordings of different streams? very likely possible
    }

    if (isStop) {
      mediaRecorder?.stop();
      mediaRecorder = null;
      isRecording = false;
    }

    if (isDownload) {
      shouldDownload = true;
      downloadFileName = fileName;
    }
    if (shouldDownload && recordedAudio?.size > 0) {
      shouldDownload = false;
      download(downloadFileName);
      downloadFileName = undefined;
    }

    return {recordedAudio, isRecording};
  };
}
