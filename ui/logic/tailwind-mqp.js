import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

export {WidthContext, useProvideWidth, useMqParser, useMq, mqpTailwind};

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};
const allBreakpoints = new Set(Object.keys(breakpoints));

const WidthContext = createContext(document.body.scrollWidth);

function useProvideWidth() {
  let [container, setContainer] = useState(document.body);
  let [width, setWidth] = useState(document.body.scrollWidth);

  useEffect(() => {
    setWidth(container.scrollWidth);
    let observer = new ResizeObserver(() => {
      setWidth(container.scrollWidth);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  let mqp = useCallback(cls => mqpTailwind(cls, width), [width]);

  return [width, setContainer, mqp];
}

function useWidth() {
  return useContext(WidthContext);
}

function useMqParser() {
  let width = useWidth();
  return useCallback(cls => mqpTailwind(cls, width), [width]);
}

function useMq(mq, smallCase, largeCase) {
  let width = useWidth();
  return width < breakpoints[mq] ? smallCase : largeCase;
}

function mqpTailwind(className, width) {
  const toggledBreakpoints = new Set(
    Object.keys(breakpoints).filter(key => width >= breakpoints[key])
  );
  return className
    .split(' ')
    .map(cls => {
      if (cls.indexOf(':') === -1) return cls;
      let [br, clsMq] = cls.split(':');
      if (!allBreakpoints.has(br)) return cls;
      if (toggledBreakpoints.has(br)) return clsMq;
    })
    .filter(cls => !!cls)
    .join(' ');
}

function mqpNoQueries(className) {
  return className
    .split(' ')
    .filter(cls => {
      if (cls.indexOf(':') === -1) return true;
      let [br] = cls.split(':');
      return !allBreakpoints.has(br);
    })
    .join(' ');
}

function mqpIdentity(className) {
  return className;
}
