import React from 'react';
import {mergeClasses} from '../logic/util';

export function PrimaryButton({className, ...props}) {
  className = mergeClasses(
    'h-12 px-6 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600',
    className
  );
  return <button className={className} {...props} />;
}

export function SecondaryButton({light, className, ...props}) {
  let bgColor = light ? 'bg-gray-100' : 'bg-gray-200';
  className = mergeClasses(
    'h-12 px-6 text-lg text-black rounded-lg focus:shadow-outline active:bg-gray-300',
    bgColor,
    className
  );
  return <button className={className} {...props} />;
}
