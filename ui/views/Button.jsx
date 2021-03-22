import React from 'react';

export function PrimaryButton({...props}) {
  return (
    <button
      className="flex-grow mt-5 h-12 px-6 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600 mr-2"
      {...props}
    />
  );
}
