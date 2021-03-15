import {set} from 'use-minimal-state';
import {config} from '../logic/config';
import {debug} from '../logic/util';
import Jam from '../Jam';

debug(config);
set(config, {
  pantryUrl: 'https://beta.jam.systems/_/pantry',
  signalHubUrl: 'https://beta.jam.systems/_/signalhub',
});

// UGLY HACK: inject css

// TODO properly include tailwind in build pipeline
let twLink = document.createElement('link');
twLink.rel = 'stylesheet';
twLink.href = 'https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css';
document.head.appendChild(twLink);

// TODO bundle css properly
let customCssLink = document.createElement('link');
customCssLink.rel = 'stylesheet';
customCssLink.href = 'https://jam.systems/css/main.css';
document.head.appendChild(customCssLink);

export default Jam;
