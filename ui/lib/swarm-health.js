export {checkWsHealth};

// connection states
export const INITIAL = 0;
export const CONNECTING = 1;
export const CONNECTED = 2;
export const DISCONNECTED = 3;

function checkWsHealth(swarm) {
  setInterval(() => {
    // console.log(
    //   'checking ws health',
    //   swarm.connectState,
    //   swarm.hub?.ws?.readyState,
    //   navigator.onLine
    // );
    if (swarm.connectState === INITIAL || swarm.connectState === CONNECTING)
      return;
    if (!navigator.onLine) return;
    switch (swarm.hub?.ws?.readyState) {
      case undefined:
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        swarm.connectState = DISCONNECTED;
        swarm.connect();
    }
  }, 1000);
}

// const online = [navigator.onLine];
// window.addEventListener('online', () => is(online, true));
// window.addEventListener('offline', () => is(online, false));

// function watchOnlineEvents(swarm) {
//   on(online, onl => {
//     log('online', onl);
//     switch (swarm.connectState) {
//       case DISCONNECTED:
//         if (onl) swarm.connect();
//         break;
//       case CONNECTING:
//       case CONNECTED:
//         if (!onl) disconnectUnwanted(swarm);
//         break;
//       default:
//     }
//   });
// }
