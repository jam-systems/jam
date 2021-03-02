import React, {useState} from 'react';
import {put} from '../logic/backend';
import {signedToken} from '../logic/identity';
import {Modal} from './Modal';

export function EditRoomModal({roomId, room, close}) {
  let updateRoom = async room_ => {
    if (!roomId || !room_) return;
    await put(signedToken(), `/rooms/${roomId}`, room_);
    close();
  };
  return (
    <Modal close={close}>
      <h1>Edit Room</h1>
      <br />
      <EditRoom room={room} onSubmit={updateRoom} onCancel={close} />
    </Modal>
  );
}

function EditRoom({room = {}, onSubmit, onCancel}) {
  let [name, setName] = useState(room.name || '');
  let [description, setDescription] = useState(room.description || '');
  let [color, setColor] = useState(room.color || '#4B5563');
  let [logoURI, setLogoURI] = useState(room.logoURI || '');
  let [buttonURI, setButtonURI] = useState(room.buttonURI || '');
  let [buttonText, setButtonText] = useState(room.buttonText || '');

  let submit = e => {
    e.preventDefault();
    onSubmit &&
      onSubmit({
        ...room,
        name,
        description,
        color,
        logoURI,
        buttonURI,
        buttonText,
      });
  };

  const [showAdvanced, setShowAdvanced] = useState(
    !!(room.logoURI || room.color)
  );
  return (
    <form onSubmit={submit}>
      <input
        className="rounded placeholder-gray-300 bg-gray-50 w-full md:w-96"
        type="text"
        placeholder="Room topic"
        value={name}
        name="jam-room-topic"
        autoComplete="off"
        onChange={e => {
          setName(e.target.value);
        }}
      ></input>
      <br />
      <div className="p-2 text-gray-500 italic">
        Pick a topic to talk about.{' '}
        <span className="text-gray-400">(optional)</span>
      </div>
      <br />
      <textarea
        className="rounded placeholder-gray-300 bg-gray-50 w-full md:w-full"
        placeholder="Room description"
        value={description}
        name="jam-room-description"
        autoComplete="off"
        rows="2"
        onChange={e => {
          setDescription(e.target.value);
        }}
      ></textarea>
      {!showAdvanced && (
        <div className="p-2 text-gray-500 italic">
          <span onClick={() => setShowAdvanced(!showAdvanced)}>
            {/* heroicons/gift */}
            <svg
              style={{cursor: 'pointer'}}
              className="pb-1 h-5 w-5 inline-block"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
          </span>
        </div>
      )}

      {/* advanced Room options */}
      {showAdvanced && (
        <div>
          <br />
          <input
            className="rounded placeholder-gray-300 bg-gray-50 w-full md:w-full"
            type="text"
            placeholder="Logo URI"
            value={logoURI}
            name="jam-room-logo-uri"
            autoComplete="off"
            onChange={e => {
              setLogoURI(e.target.value);
            }}
          ></input>
          <div className="p-2 text-gray-500 italic">
            Set the URI for your logo.{' '}
            <span className="text-gray-400">(optional)</span>
          </div>

          <br />
          <input
            className="rounded w-44 h-12"
            type="color"
            value={color}
            name="jam-room-color"
            autoComplete="off"
            onChange={e => {
              setColor(e.target.value);
            }}
          ></input>
          <div className="p-2 text-gray-500 italic">
            Set primary color for your Room.{' '}
            <span className="text-gray-400">(optional)</span>
          </div>

          <br />
          <input
            className="rounded placeholder-gray-400 bg-gray-50 w-full md:w-full"
            type="text"
            placeholder="Button URI"
            value={buttonURI}
            name="jam-room-button-uri"
            autoComplete="off"
            onChange={e => {
              setButtonURI(e.target.value);
            }}
          ></input>
          <div className="p-2 text-gray-500 italic">
            Set the link for the 'call to action' button.{' '}
            <span className="text-gray-400">(optional)</span>
          </div>

          <br />
          <input
            className="rounded placeholder-gray-400 bg-gray-50 w-full md:w-96"
            type="text"
            placeholder="Button Text"
            value={buttonText}
            name="jam-room-button-text"
            autoComplete="off"
            onChange={e => {
              setButtonText(e.target.value);
            }}
          ></input>
          <div className="p-2 text-gray-500 italic">
            Set the text for the 'call to action' button.{' '}
            <span className="text-gray-400">(optional)</span>
          </div>
        </div>
      )}
      <button
        onClick={submit}
        className="mt-5 h-12 px-6 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600 mr-2"
      >
        Update Room
      </button>
      <button
        onClick={onCancel}
        className="mt-5 h-12 px-6 text-lg text-black bg-gray-100 rounded-lg focus:shadow-outline active:bg-gray-300"
      >
        Cancel
      </button>
    </form>
  );
}
