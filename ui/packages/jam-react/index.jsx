import React from 'react';

export default function Jam({jamUrl, roomId, newRoom, ...props}) {
  jamUrl = jamUrl || 'https://jam.systems';
  if (!jamUrl.endsWith('/')) jamUrl = jamUrl + '/';
  let hash = !newRoom ? '' : '#' + encodeParams(newRoom);
  return (
    <iframe
      src={`${jamUrl}${roomId || ''}${hash}`}
      allow="microphone;*"
      {...props}
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
