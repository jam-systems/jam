import React, {useState} from 'react';
import {put} from '../logic/backend';
import {Modal} from './Modal';

export function EditRoomModal({roomId, room, close}) {
  let updateRoom = async room_ => {
    if (!roomId || !room_) return;
    await put(`/rooms/${roomId}`, room_);
    close();
  };
  return (
    <Modal close={close}>
      <h1>Room Settings</h1>
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
  let [closed, setClosed] = useState(room.closed || false);

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
        closed,
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
        className="rounded -mb-1 placeholder-gray-300 bg-gray-50 w-full md:w-full"
        placeholder="Room description"
        value={description}
        name="jam-room-description"
        autoComplete="off"
        rows="2"
        onChange={e => {
          setDescription(e.target.value);
        }}
      ></textarea>
      <div className="p-2 text-gray-500 italic">
        Describe what this room is about.{' '}
        <span className="text-gray-400">
          (optional) (supports{' '}
          <a
            className="underline"
            href="https://www.markdownguide.org/cheat-sheet/"
            target="_blank"
            rel="noreferrer"
          >
            Markdown
          </a>
          )
        </span>{' '}
      </div>


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
            Set the link for the {`'call to action'`} button.{' '}
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
            Set the text for the {`'call to action'`} button.{' '}
            <span className="text-gray-400">(optional)</span>
          </div>

          <br />
          <hr/>
          <br />
          <input
            className="ml-2"
            type="checkbox"
            name="jam-room-closed"
            id="jam-room-closed"
            onChange={e => {setClosed(!closed)}} defaultChecked={closed}/>

          <label
            className="pl-2"
            for="jam-room-closed">Close the room (experimental){' '}</label>

          <div className="p-2 text-gray-500 italic">
            Closed rooms can only be joined by moderators.<br/>
            Everyone else sees the description and the 'call to action' button.
          </div>

          <br />
          <hr/>
          <br />
          <input
            className="rounded bg-gray-50 text-gray-400 w-full"
            value={`<iframe src="${window.location.href}" allow="microphone *;" width="420" height="600"></iframe>`} />

          <div className="p-2 text-gray-500 italic">
            Embed this room using an iFrame. (
            <a
              className="underline"
              href="https://gitlab.com/jam-systems/jam"
              target="_blank"
              rel="noreferrer"
            >
              Learn more
            </a>)
          </div>

        </div>
      )}
      <div className="flex">
        <button
          onClick={submit}
          className="flex-grow mt-5 h-12 px-6 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600 mr-2"
        >
          Update Room
        </button>
        <button
          onClick={onCancel}
          className="mt-5 h-12 px-6 text-lg text-black bg-gray-100 rounded-lg focus:shadow-outline active:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
