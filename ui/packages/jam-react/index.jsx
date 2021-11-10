import React from 'react';

export {Jam as default};

function Jam({jamUrl, roomId, params, ...props}) {
  jamUrl = jamUrl || 'https://jam.systems';
  if (!jamUrl.endsWith('/')) jamUrl = jamUrl + '/';
  let hash = !params ? '' : '#' + encodeBase64Url(params);
  return (
    <iframe
      src={`${jamUrl}${roomId || ''}${hash}`}
      allow="microphone *; screen-wake-lock *"
      {...props}
    />
  );
}

function encodeBase64Url(object) {
  let bytes = new TextEncoder().encode(JSON.stringify(object));
  let n = bytes.length;
  let chars = new Array(n);
  for (let i = 0; i < n; i++) {
    chars[i] = String.fromCharCode(bytes[i]);
  }
  return btoa(chars.join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// function encodeParams(params) {
//   let strings = [];
//   for (let param in params) {
//     strings.push(
//       [encodeURIComponent(param), encodeURIComponent(params[param])].join('=')
//     );
//   }
//   return strings.join('&');
// }
