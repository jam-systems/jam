# jam-core

Client-side JavaScript/TypeScript library for [🍓 Jam](https://jam.systems).

```sh
npm i jam-core
```

```js
import {createJam} from 'jam-core';

let roomId = 'my-jam-1234';
let jamConfig = {domain: 'jam.systems'};

// create client-side jam instance
const [state, {setProps, enterRoom, createRoom}] = createJam({jamConfig});

// create jam room on the server
createRoom(roomId, {name: 'My Jam', stageOnly: true});

// set room id (= connect to the room from the client)
setProps({roomId});

// join room. this will ask users for their microphone & enable them to hear others
await enterRoom(roomId);

console.log(state.inRoom === roomId); // true
```

Embedding this example [in a HTML page](https://gitlab.com/jam-systems/jam/-/blob/master/ui/examples/minimal-jam/index.html) and running it in two different browsers is actually enough to let two people speak with each other over WebRTC 🎧

You can use `jam-core` to build custom UIs and bots that run in a Browser.

Find out more about Jam on our Gitlab: [https://gitlab.com/jam-systems/jam](https://gitlab.com/jam-systems/jam)

`jam-core` is compatible with [Jam as a Service](https://jamshelf.com/) where we manage Jam servers for you. This lets you build powerful connected audio apps while only worrying about the UI 🚀

`jam-core` is independent of any JavaScript/TypeScript framework. You might want to check out the companion library [jam-core-react](https://gitlab.com/jam-systems/jam/-/tree/master/ui/packages/jam-core-react) for integrating `jam-core` into a React app.

_This library works in all modern browsers._

## Documentation

```js
import {createJam} from 'jam-core';
```

The API essentially consists of a single function, `createJam()`, which returns an array of two objects:

```js
const [state, api] = createJam(options);
```

`state` and `api` together represent a _single user_ in a _single Jam room_ (which can be switched), as in the [official Jam app](https://jam.systems). If this is your use case, you probably need to call `createJam()` exactly once at the beginning. (If you want your page to act as multiple users or be in multiple Jam rooms at the same time, you have to `createJam()` multiple times.)

The `options` parameter is mainly a way of specifying the domain where Jam is hosted on, and whether this domain has an SFU (server-side streaming) enabled:

```js
let options = {
  // main options
  jamConfig: {
    domain: 'jam.example.com', // default: 'jam.systems', our public Jam instance
    sfu: false, // default: false
  },

  // other options you probably don't need:
  cachedRooms: {
    // cached rooms, to avoid the GET request which pulls room info from the server
    'my-hardcoded-room': {
      name: 'My hardcoded Room',
      speakers: [],
      moderators: [],
    },
  },
  debug: false, // log debug output to the console (don't set to true in production)
};
```

### `state`

`state` holds information about current client-side state, the room, discovered peers and various others. `state` is only for reading -- it will be mutated by Jam as the application evolves.

As an example, one property that will be on your `state` immediately is `state.myIdentity`, which is stored in the Browser's localStorage and auto-created if not found there:

```js
const [state, api] = createJam();

console.log(state.myIdentity);
// {
//   "publicKey": "3EQBODw0NzYHTfJhsBuf1M1wggPIHbWM2mZgz2DWQpU",
//   "secretKey": "wpGWxQYIDkdKivt4CKecSHIGxMkWZIsk9Y_T2wmUA3ncRAE4PDQ3NgdN8mGwG5_UzXCCA8gdtYzaZmDPYNZClQ",
//   "info": {
//     "id": "3EQBODw0NzYHTfJhsBuf1M1wggPIHbWM2mZgz2DWQpU"
//   }
// }
```

This is a cryptographic key pair that represents your user account. The public key simultaneously acts as your user id; it's available as a shortcut on `state.myId`.

```js
console.log(state.myId); // "3EQBODw0NzYHTfJhsBuf1M1wggPIHbWM2mZgz2DWQpU"
```

Some more examples:

```js
let {
  roomId, // string or null; the current room ID
  inRoom, // string or null; equal to roomId if the room was joined, null otherwise
  room, // = {name, description, speakers, moderators, stageOnly, ...}; various information about the room
  iAmSpeaker, // boolean; is the user a speaker in the room?

  peers, // array of other user's ids which are currently in the same room

  myAudio, // the user's audio stream, can come from his mic or from a streamed file, or be null
  micMuted, // boolean; has the the user muted his mic?

  peerState, // = {peerId: {micMuted, inRoom}, peerId2: ...}; object with info about each peer's state
} = state;
```

The full up-to-date specification of `state` is exposed via TypeScript and can be inspected [in the source code](https://gitlab.com/jam-systems/jam/-/blob/master/ui/jam-core/state.ts#L44).

### `api`

`api` holds various methods to interact with Jam. It lets you do all things programmatically that you can do interactively in the [official Jam UI](https://jam.systems).

Let's unpack these methods by grouping them into three categories:

#### 1. Manage rooms and identities on the backend

The first kinds of methods are wrappers around REST API calls that will modify state on the Jam server. They are all async and return `true` if the operation succeeded, `false` otherwise.

Example:

```js
const [state, api] = createJam();
let {createRoom, addSpeaker, removeSpeaker, updateIdentity} = api;

// create a room; you will be the first speaker and moderator in that room
let roomId = 'my-jam-1234';
let ok = await createRoom(roomId, {name: 'My new room'});

if (!ok) console.warn('the room possibly already existed');

console.log(state.roomId); // null, because creating a room doesn't mean being in the room

// add another speaker to the room
ok = await addSpeaker(roomId, 'kXISM4HDE4CXugmALs02mUEr4vKPK6DFJgGmhCVV7hY');

// remove yourself as a speaker
ok = await removeSpeaker(roomId, state.myId);

// update your own identity
ok = await updateInfo({name: 'Thomas'});

console.log(state.myIdentity.info);
// {
//   "id": "3EQBODw0NzYHTfJhsBuf1M1wggPIHbWM2mZgz2DWQpU",
//   "name": "Thomas"
// }
```

There are currently no JavaScript methods for _fetching_ information about rooms/identities from the server, because Jam will do that automatically as needed, and will listen to most information in real-time by connecting via WebSocket.

However, you could use our REST API to check that the calls above succeeded:

```js
let roomId = 'my-jam-1234';
let response = await fetch(
  `https://jam.systems/_/pantry/api/v1/rooms/${roomId}`
);
let room = await response.json();
console.log(room);
// {
//   "name": "My new room",
//   "description": "",
//   "speakers": ["kXISM4HDE4CXugmALs02mUEr4vKPK6DFJgGmhCVV7hY"], // <-- the speaker you added
//   "moderators": ["3EQBODw0NzYHTfJhsBuf1M1wggPIHbWM2mZgz2DWQpU"], // <-- you
//   ...
// }
```

Full API for managing rooms and identities on the backend:

```js
let {
  // create room; will initially have the current user as the only moderator and speaker
  createRoom, // async (roomId, partialRoom?: {name, ...}) => ok;

  // update room; completely replaces the room object, rejects if moderator/speaker array is not set
  updateRoom, // async (roomId, room: {name, moderators, speakers, ...}) => ok

  addSpeaker, // async (roomId, peerId) => ok
  addModerator, // async (roomId, peerId) => ok
  removeSpeaker, // async (roomId, peerId) => ok
  removeModerator, // async (roomId, peerId) => ok

  updateInfo, // async (info: {name, avatar, ...}) => ok

  addAdmin, // async (peerId) => ok, only possible for server admins
  removeAdmin, // async (peerId) => ok
} = api;
```

#### 2. Operate the current Jam room

These methods correspond to some user action. They are async and are _batched_ automatically. To interrupt batching and see changes reflected, just `await` the returned Promise.

Example:

```js
const [state, api] = createJam();
let {
  setProps,
  enterRoom,
  leaveRoom,
  sendReaction,
  startRecording,
  stopRecording,
} = api;

let roomId = 'my-jam-1234';

// set the roomId; will try to fetch and connect to room
setProps({roomId});
console.log(state.roomId); // null, because batched with other calls in this microtask

await setProps({roomId});
console.log(state.roomId); // 'my-new-room-123', because we awaited the last call

// do this on the first user interaction! it let's Jam know that we can safely play audio / use AudioContext
setProps({userInteracted: true});

// join room
await enterRoom(roomId);
console.log(state.inRoom); // 'my-new-room-123'

// leave room
await leaveRoom();
console.log(state.inRoom); // null

// join again
await enterRoom(roomId);

// send some emoji reactions
sendReaction('❤️');
sendReaction('❤️');
await sendReaction('❤️');
console.log(state.reactions);
// {
//   "3EQBODw0NzYHTfJhsBuf1M1wggPIHbWM2mZgz2DWQpU": [
//     ["❤️", 0.21084078497860237], // the numbers are just random ids
//     ["❤️", 0.7380676836914504],
//     ["❤️", 0.024757822224887427]
//   ]
// }

// the reactions will last 5 seconds
await new Promise(r => setTimeout(r, 6000));
console.log(state.reactions);
// { "3EQBODw0NzYHTfJhsBuf1M1wggPIHbWM2mZgz2DWQpU": [] }

// make a 10 second recording
await startRecording();

console.log(state.isRecording); // true

await new Promise(r => setTimeout(r, 10000));
await stopRecording();

console.log(state.isRecording); // false

await new Promise(r => setTimeout(r, 100)); // we have to wait briefly until the recording is ready
console.log(state.recordedAudio); // Blob { size: 1164, type: "audio/mp3; codecs=opus" }
```

If you're wondering when to do `setProps({roomId})`: In the official Jam UI, we sync this to the current URL, i.e. it is called on navigation to `https://jam.systems/<roomId>`. In that state, the library eagerly fetches the room and tries to connect with other peers, but only if the room exists.

Full API for operating the current Jam room:

```js
let {
  setProps, // async (props) => undefined; see below

  enterRoom, // async (roomId) => undefined
  leaveRoom, // async () => undefined
  leaveStage, // async () => undefined
  sendReaction, // async (reaction) => undefined
  retryMic, // async () => undefined
  retryAudio, // async () => undefined
  autoJoinOnce, // async () => undefined

  startRecording, // async () => undefined
  stopRecording, // async () => undefined
  downloadRecording, // async (fileName) => undefined
} = api;
```

Several ways to operate the current Jam room are combined in a single `setProps()` method which takes a partial object of stuff that should be changed:

```js
setProps({
  roomId: 'my-jam-1234', // initial: null
  userInteracted: true, // initial: false
  micMuted: true, // initial: false,
  handRaised: true, // initial: false
});
```

#### 3. Listen to changes

Finally, there is one method that lets you listen to state changes, which may for example be triggered by other users interacting with the room:

```js
let {onState} = api;

// specify `state` key to listen to:
onState('peers', peers => {
  console.log('peers changed:', peers);
});

// listen to all `state` changes:
onState((key, value) => {
  console.log('state change:', key, value);
});
```

`onState()` returns a callback that lets you unsubscribe the listener:

```js
let {onState, setProps} = api;

let unsubscribe = onState('micMuted', muted =>
  console.log(`mic muted? ${muted}!`)
);

await setProps({micMuted: true});

// "mic muted? true!"

unsubscribe();

await setProps({micMuted: false});

// nothing logged
```

Note that you probably don't need `onState()` when using our React integration [jam-core-react](https://gitlab.com/jam-systems/jam/-/tree/master/ui/packages/jam-core-react), which will give you React hooks to subscribe to state changes from components.

### Additional API for identities

Sometimes you might need to manually specify the identity of your user, rather than let us create a random one. For this, we give you two functions which are best called before `createJam()`:

- `importDefaultIdentity(identity)` lets you replace the current default identity stored in the browser:

```js
import {importDefaultIdentity, createJam} from 'jam-core';

importDefaultIdentity({
  publicKey: '...',
  secretKey: '...',
  info: {name: 'Christoph'},
});

// all of the properties on the input object are optional!

// just the secret key is enough to restore an existing user:
importDefaultIdentity({secretKey: '...'});

// alternatively, you can pass a seed from which the keys are created deterministically:
importDefaultIdentity({seed: 'arbitrary string!', info: {name: 'Christoph'}});

// if you pass neither keys or seed and an identity already exists, the info will just be merged into the existing one
importDefaultIdentity({info: {name: 'Christoph'}});

let [state, api] = createJam();

console.log(state.myIdentity.info.name); // "Christoph"
```

- `importRoomIdentity(roomId, identity)` lets you specify an identity that only applies in one specific room:

```js
import {importRoomIdentity, createJam} from 'jam-core';

let roomId = 'the-simpsons-jam';

// API is the same as importDefaultIdentity with an additional `roomId` parameter
importRoomIdentity(roomId, {secretKey: '...', info: {name: 'Homer Simpson'}});
importRoomIdentity(roomId, {secretKey: '...'});
importRoomIdentity(roomId, {
  seed: 'arbitrary string!',
  info: {name: 'Homer Simpson'},
});
importRoomIdentity(roomId, {info: {name: 'Homer Simpson'}});

let [state, api] = createJam();

console.log(state.myIdentity.info.name); // undefined

await setProps({roomId: 'the-simpsons-jam'});

console.log(state.myIdentity.info.name); // "Homer Simpson"
```

## Examples

Example code for a super simple custom UI with manual DOM-updating: https://gitlab.com/jam-systems/jam/-/blob/master/ui/examples/tiny-jam/index.html

Real-life examples for using `jam-core` for bots (we used this for load-testing Jam!): https://github.com/mitschabaude/jam-bots

Also, the official [Jam UI](https://jam.systems) is built entirely on `jam-core` (but mostly accesses it through the React integration): https://gitlab.com/jam-systems/jam/-/blob/master/ui/Jam.jsx
