import React from 'react';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';

function customUriTransformer(uri) {
  return uri.startsWith('bitcoin:') ? uri : ReactMarkdown.uriTransformer(uri);
}

export default function RoomHeader({name, description, logoURI, editRoom}) {
  return (
    <div className="flex">
      {logoURI && (
        <div className="flex-none">
          <img
            className="w-16 h-16 border rounded p-1 m-2 mt-0"
            src={logoURI}
            style={{objectFit: 'cover'}}
          />
        </div>
      )}
      <div className="flex-grow">
        <h1 className="pl-2">{name}</h1>
        <div className="pl-2 text-gray-500">
          <ReactMarkdown
            className="markdown"
            plugins={[gfm]}
            linkTarget="_blank"
            transformLinkUri={customUriTransformer}
          >
            {description || 'This is a Room on Jam'}
          </ReactMarkdown>
        </div>
      </div>
      {editRoom && (
        <div className="flex-none w-8 h-6 cursor-pointer" onClick={editRoom}>
          <EditSvg />
        </div>
      )}
    </div>
  );
}

function EditSvg() {
  return (
    <svg className="text-gray-500 w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
  );
}
