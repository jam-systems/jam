import React from 'react';
import {useWidth, breakpoints} from '../lib/tailwind-mqp';
import {mergeClasses} from '../lib/util';

export default function Container({className, style, ...props}) {
  let width = useWidth();
  let belowSm = width < breakpoints.sm;
  let border = belowSm ? '0px' : '2px solid lightgrey';
  return (
    <div
      className={mergeClasses('b-0', className)}
      style={{
        width: width < 720 ? '100%' : '700px',
        margin: '0 auto',
        padding: '13px',
        height: '100%',
        borderRadius: belowSm ? '0' : '30px 30px 0 0',
        borderTop: border,
        borderLeft: border,
        borderRight: border,
        borderBottom: '0px',
        backgroundColor: 'white',
        boxSizing: 'border-box',
        ...(style || null),
      }}
      {...props}
    />
  );
}
