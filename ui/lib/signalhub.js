// adapted from mafintosh/signalhub/index.js to work standalone in the browser
export default (...args) => new SignalHub(...args);

class SignalHub {
  constructor(app, url) {
    if (!app) throw new Error('app name required');
    if (!url) throw new Error('signalhub url required');

    this.app = app;
    url = url.replace(/\/$/, '');
    this.url = url.indexOf('://') === -1 ? 'http://' + url : url;
    this.subscribers = [];
    this.closed = false;
  }

  subscribe(channel, onMessage) {
    if (this.closed) throw new Error('Cannot subscribe after close');

    let endpoint = Array.isArray(channel) ? channel.join(',') : channel;
    let subscriber = new EventSource(
      this.url + '/v1/' + this.app + '/' + endpoint
    );
    subscriber.addEventListener('message', e => {
      onMessage(decode(e.data));
    });

    this.subscribers.push(subscriber);
    return subscriber;
  }

  // TODO: this is untested as we ended up not needing it
  unsubscribe(subscriber) {
    subscriber.close();
    arrayRemove(this.subscribers, subscriber);
  }

  async broadcast(channel, message = {}) {
    if (this.closed) throw new Error('Cannot broadcast after close');
    let url = this.url + '/v1/' + this.app + '/' + channel;
    let res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      throw new Error('Bad status: ' + res.status);
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.subscribers.forEach(subscriber => {
      subscriber.close();
    });
  }
}

function decode(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    return undefined;
  }
}

function arrayRemove(arr, el) {
  let i = arr.indexOf(el);
  if (i !== -1) arr.splice(i, 1);
}
