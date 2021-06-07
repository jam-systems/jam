import {createJam} from 'jam-core';

const roomId = 'minimal-jam-1234';
main();

async function main() {
  // mount Jam
  const [state, {setProps, enterRoom, createRoom}] = createJam();

  // try to create room
  createRoom(roomId, {stageOnly: true});

  // set room id
  setProps({roomId});

  // enter room
  await enterRoom(roomId);

  console.log(state.inRoom === roomId);
}
