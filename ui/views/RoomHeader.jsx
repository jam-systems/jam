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
    <svg
      className="text-gray-500 w-6 h-6"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  );
}
