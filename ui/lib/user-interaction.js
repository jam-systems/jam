// TODO this lib does not work reliably on iOS
const activationEvents = ['change', 'click', 'contextmenu', 'dblclick'];

export function onFirstInteraction(cb) {
  let listener = () => {
    for (let event of activationEvents) {
      document.body.removeEventListener(event, listener);
    }
    if (cb) cb();
  };

  for (let event of activationEvents) {
    document.body.addEventListener(event, listener);
  }
}
