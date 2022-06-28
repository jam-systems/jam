import React from 'react';
import {useWidth, breakpoints} from '../lib/tailwind-mqp';
import {mergeClasses} from '../lib/util';
import {colors} from '../lib/theme';
import {use} from 'use-minimal-state';
import {useJam} from '../jam-core-react/JamContext.js';

export default function Container({className, style, ...props}) {
  const [state] = useJam();
  let [room] = use(state, ['room']);
  let width = useWidth();
  let belowSm = width < breakpoints.sm;
  let border = belowSm ? '0px' : '2px solid lightgrey';
  const roomColors = colors(room);
  let backgroundColor = roomColors.background;
  let color = roomColors.text;
  return (
    <div
      className={mergeClasses('container b-0', className)}
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
        backgroundColor,
        color,
        boxSizing: 'border-box',
        ...(style || null),
      }}
      {...props}
    />
  );
}
