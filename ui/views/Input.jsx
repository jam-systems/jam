import React, {useRef, useState} from 'react';
import {useMediaQuery} from '../logic/tailwind-mqp';
import {mergeClasses} from '../logic/util';

export default function Input({className, inputRef, ...props}) {
  let width = useMediaQuery('sm', 'w-full', 'w-96');
  return (
    <input
      className={mergeClasses(
        'rounded placeholder-gray-400 bg-gray-50',
        width,
        className
      )}
      type="text"
      ref={inputRef}
      {...props}
    />
  );
}

export function LabeledInput({label, optional = false, ...props}) {
  return (
    <label className="block">
      <Input {...props} />
      <p className="p-2 italic text-gray-500">
        {label}
        {optional && <span className="text-gray-300"> (optional)</span>}
      </p>
    </label>
  );
}

export function useInput(initial) {
  let [value, setValue] = useState(initial || '');
  return [
    value,
    {
      value,
      onChange: e => {
        setValue(e.target.value || '');
      },
    },
  ];
}

export function useFileInput() {
  let inputRef = useRef();
  return [
    () => inputRef.current?.files[0],
    {
      inputRef,
      type: 'file',
    },
  ];
}
