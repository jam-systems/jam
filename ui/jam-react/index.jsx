import React from 'react';

export default function Jam({jamUrl, roomId, newRoom, style}) {
  jamUrl = jamUrl || 'https://jam.systems';
  let hash = !newRoom ? '' : '#' + encodeParams(newRoom);
  return (
    <iframe
      style={style}
      src={`${jamUrl}/${roomId || ''}${hash}`}
      allow="microphone;*"
    />
  );
}

function encodeParams(params) {
  let strings = [];
  for (let param in params) {
    strings.push(
      [encodeURIComponent(param), encodeURIComponent(params[param])].join('=')
    );
  }
  return strings.join('&');
}
