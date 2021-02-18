import React from 'react';
import use from '../lib/use-state';
import state from '../state';

export default function Modals() {
  let modals = use(state, 'modals');
  if (!modals) return null;
  return [...modals].map(([id, Modal, props]) => <Modal key={id} {...props} />);
}

export function Modal({close, children}) {
  return (
    <div
      style={{
        position: 'absolute',
        zIndex: '10',
        top: '0',
        left: '0',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#00000033',
        display: 'flex',
        alignItems: 'center',
        padding: '1.25rem',
      }}
      onClick={close}
    >
      <div
        style={{
          flex: 'none',
          display: 'flex',
          flexDirection: 'column',
          margin: '0 auto',
          width: '600px',
          maxWidth: '100%',
          maxHeight: '100%',
          overflowY: 'hidden',
          backgroundColor: 'white',
          borderRadius: '30px',
        }}
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <div
          style={{
            flex: 'none',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={close}
            style={{padding: '0.75rem', borderRadius: '50%', cursor: 'pointer'}}
          >
            <CloseSvg />
          </div>
        </div>
        <div
          style={{
            flex: '0 1 auto',
            overflowY: 'auto',
            minHeight: '0',
            padding: '0 1rem',
          }}
        >
          {children}
          <div style={{height: '1.5rem'}} />
        </div>
      </div>
    </div>
  );
}

export function openModal(Component, props, id) {
  id = id || Math.random();
  let modal = [id, Component];
  let close = () => {
    state.modals.delete(modal);
    state.update('modals');
  };
  props = {...(props || null), close};
  modal.push(props);
  state.modals.add(modal);
  state.update('modals');
  return close;
}

export function closeModal(id) {
  let toDelete = [];
  for (let modal of state.modals) {
    let [id_] = modal;
    if (id_ === id) {
      toDelete.push(modal);
    }
  }
  for (let modal of toDelete) {
    state.modals.delete(modal);
  }
  state.update('modals');
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
