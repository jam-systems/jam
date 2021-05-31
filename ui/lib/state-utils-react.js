import {useEffect} from 'react';
import {is} from 'minimal-state';

export {useSync};

async function useSync(...args) {
  let deps = args.pop();
  useEffect(() => {
    is(...args);
  }, deps);
}
