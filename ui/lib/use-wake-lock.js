import {useEffect} from 'react';

export default function useWakeLock() {
  useEffect(() => {
    if (!navigator.wakeLock) return;
    let wakeLock;
    let getWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('acquiring wake lock failed', err);
      }
    };
    getWakeLock();
    let onVisibilityChange = () => {
      if (document.visibilityState === 'visible') getWakeLock();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return async () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      await wakeLock.release();
      wakeLock = null;
    };
  }, []);
}
