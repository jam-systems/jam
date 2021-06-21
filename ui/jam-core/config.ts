const defaultConfig = {
  urls: {
    pantry: `https://beta.jam.systems/_/pantry`,
    stun: `stun:stun.beta.jam.systems:3478`,
    turn: `turn:turn.beta.jam.systems:3478`,
    turnCredentials: {username: 'test', credential: 'yieChoi0PeoKo8ni'},
  },
  development: false,
  sfu: false,
};

const staticConfig =
  ((window as any).jamConfig as typeof defaultConfig) ?? defaultConfig;

export {staticConfig};
