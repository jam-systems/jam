import {set} from 'use-minimal-state';
import {config} from '../logic/config';
import {debug} from '../logic/util';
import Jam from '../Jam';
import css from '../css/main.css';

function prepareForComponent() {
  debug(config);
  set(config, {
    pantryUrl: 'https://beta.jam.systems/_/pantry',
    signalHubUrl: 'https://beta.jam.systems/_/signalhub',
    isEmbedded: true,
  });

  // TODO: CSS injection should be done on component mount

  // TODO properly include tailwind in build pipeline
  // TODO don't make tailwind CSS leak
  let twLink = document.createElement('link');
  twLink.rel = 'stylesheet';
  twLink.href = 'https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css';
  document.head.appendChild(twLink);

  // // i think this is be the proper way to add CSS for a component
  let customCssStyle = document.createElement('style');
  customCssStyle.appendChild(document.createTextNode(css));
  document.head.appendChild(customCssStyle);
}

// TODO: this would be the code if we would export Jam as inline React component
// but for now we use iframes instead

prepareForComponent();
export default Jam;
