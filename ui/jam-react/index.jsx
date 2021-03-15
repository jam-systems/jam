import {set} from 'use-minimal-state';
import {config} from '../logic/config';
import {debug} from '../logic/util';
import Jam from '../Jam';

import css from '../css/main.css';

debug(config);
set(config, {
  pantryUrl: 'https://beta.jam.systems/_/pantry',
  signalHubUrl: 'https://beta.jam.systems/_/signalhub',
  isEmbedded: true,
});

// UGLY HACK: inject css

// TODO properly include tailwind in build pipeline
let twLink = document.createElement('link');
twLink.rel = 'stylesheet';
twLink.href = 'https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css';
document.head.appendChild(twLink);

let customCssStyle = document.createElement('style');
customCssStyle.appendChild(document.createTextNode(css));
document.head.appendChild(customCssStyle);

export default Jam;
