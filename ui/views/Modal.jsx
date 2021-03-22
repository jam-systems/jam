import React from 'react';
import {update, use} from 'use-minimal-state';
import {useMediaQuery, useMqParser} from '../logic/tailwind-mqp';

const modals = [new Set()];

export default function Modals() {
  let $modals = use(modals);
  if (!$modals) return null;
  return [...$modals].map(([id, Modal, props]) => (
    <Modal key={id} {...props} />
  ));
}

export function Modal({close, children}) {
  let mqp = useMqParser();
  return (
    <div
      className={mqp('p-0 sm:p-5 items-stretch sm:items-center')}
      style={{
        position: 'absolute',
        zIndex: '10',
        top: '0',
        left: '0',
        height: '100%',
        width: '100%',
        backgroundColor: '#00000033',
        display: 'flex',
      }}
      onClick={close}
    >
      <div
        className={mqp('relative p-1 pt-10 pb-10 sm:rounded-xl')}
        style={{
          flex: 'none',
          display: 'flex',
          flexDirection: 'column',
          margin: '0 auto',
          width: useMediaQuery('sm', '100%', '640px'),
          maxWidth: '100%',
          maxHeight: '100%',
          overflowY: 'hidden',
          backgroundColor: 'white',
        }}
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <div className="absolute top-2 right-2">
          <div
            onClick={close}
            style={{padding: '0.75rem', borderRadius: '50%', cursor: 'pointer'}}
          >
            <CloseSvg />
          </div>
        </div>
        <div
          className={mqp('px-5 sm:px-8')}
          style={{
            flex: '0 1 auto',
            overflowY: 'auto',
            minHeight: '0',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function openModal(Component, props, id) {
  let [$modals] = modals;
  if (id) {
    // don't show two modals with the same id
    for (let modal of $modals) {
      if (modal[0] === id) {
        return;
      }
    }
  }
  id = id || Math.random();
  let modal = [id, Component];
  let close = () => {
    $modals.delete(modal);
    update(modals);
  };
  props = {...(props || null), close};
  modal.push(props);
  $modals.add(modal);
  update(modals);
  return close;
}

export function closeModal(id) {
  let [$modals] = modals;
  for (let modal of $modals) {
    if (modal[0] === id) {
      $modals.delete(modal);
      break;
    }
  }
  update(modals);
}

function CloseSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
