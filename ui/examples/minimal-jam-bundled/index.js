import {createJam, createRoom} from 'jam-core';

const roomId = 'minimal-jam-1234';
main();

async function main() {
  // mount Jam
  const [state, {setState, enterRoom}] = createJam();

  // try to create room
  createRoom(state, roomId, {stageOnly: true});

  // set room id
  setState({roomId});

  // enter room
  enterRoom(roomId);
}
