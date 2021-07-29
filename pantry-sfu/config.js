import {config} from 'dotenv';
config();

const jamHost = process.env.JAM_HOST || 'beta.jam.systems';
const local = process.env.LOCAL;

export {jamHost, local};
