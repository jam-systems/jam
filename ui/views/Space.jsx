import React from 'react';
import {mergeClasses} from '../logic/util';

export default function Space({x = 1, className, ...props}) {
  return <div className={mergeClasses(`h-${x}`, className)} {...props} />;
}

export {Space as VSpace};

export function HSpace({x = 1, className, ...props}) {
  return <div className={mergeClasses(`w-${x}`, className)} {...props} />;
}
