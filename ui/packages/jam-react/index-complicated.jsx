// this code was written in the hope of preventing the iframe from reloading when its src hash changed
// didn't work though... leaving it here for now
import React, {useEffect, useRef, useState} from 'react';

export {Jam as default};

function Jam({jamUrl, roomId, params, style}) {
  jamUrl = jamUrl || 'https://jam.systems';
  if (!jamUrl.endsWith('/')) jamUrl = jamUrl + '/';
  let hash = !params ? '' : '#' + encodeBase64Url(params);
  let ref = useRef();
  let [store] = useState({});

  useEffect(() => {
    if (ref.current) {
      if (!store.initialized) {
        store.initialized = true;
        let iframe = document.createElement('iframe');
        // iframe.allow = 'microphone *; screen-wake-lock *';
        iframe.src = `${jamUrl}${roomId || ''}${hash}`;
        iframe.style = 'height: 100%; width: 100%';
        store.iframe = iframe;
        ref.current.appendChild(iframe);
      } else {
        store.iframe.src = `${jamUrl}${roomId || ''}${hash}`;
      }
      console.error('hash changed!', hash);
    }
  }, [hash]);

  return <div style={style} ref={ref}></div>;
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
