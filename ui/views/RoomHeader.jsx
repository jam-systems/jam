import React from 'react';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';

function customUriTransformer(uri) {
  return uri.startsWith('bitcoin:') ? uri : ReactMarkdown.uriTransformer(uri);
}

export default function RoomHeader({name, description, logoURI}) {
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
    </div>
  );
}
