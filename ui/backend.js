import {useEffect, useState} from 'react';

const API = 'https://pantry.jam.systems/api/v1';

export function useIsRoomNew(roomId) {
  let [[isNew, isLoading], setState] = useState([false, true]);

  useEffect(() => {
    fetch(API + '/rooms/' + roomId).then(res => {
      if (res.status >= 400) {
        setState([true, false]);
      } else {
        setState([false, false]);
      }
    });
  }, [roomId]);
  return [isNew, isLoading];
}
