import React, {useState} from 'react';
import {useMqParser} from '../lib/tailwind-mqp';
import {Modal} from './Modal';
import {rawTimeZones} from '@vvo/tzdb';
import {useJam} from '../jam-core-react';

export function EditRoomModal({roomId, room, close}) {
  const [, {updateRoom}] = useJam();

  let submitUpdate = async partialRoom => {
    updateRoom(roomId, {...room, ...partialRoom});
  };

  let [name, setName] = useState(room.name || '');
  let [description, setDescription] = useState(room.description || '');
  let [color, setColor] = useState(room.color || '#4B5563');
  let [logoURI, setLogoURI] = useState(room.logoURI || '');
  let [buttonURI, setButtonURI] = useState(room.buttonURI || '');
  let [buttonText, setButtonText] = useState(room.buttonText || '');
  let [closed, setClosed] = useState(room.closed || false);
  let [shareUrl, setShareUrl] = useState(room.shareUrl || '');

  let [schedule, setSchedule] = useState(room.schedule);
  let [scheduleCandidate, setScheduleCandidate] = useState({
    date: `${new Date().toISOString().split('T')[0]}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  let [showTimezoneSelect, setShowTimezoneSelect] = useState(false);
  let [showRepeatSelect, setShowRepeatSelect] = useState(false);

  let completeSchedule = () => {
    return scheduleCandidate?.date && scheduleCandidate?.time;
  };

  let handleScheduleChange = e => {
    setScheduleCandidate({
      ...scheduleCandidate,
      [e.target.name]: e.target.value,
    });
    console.log(scheduleCandidate);
  };

  let removeSchedule = e => {
    e.preventDefault();
    setSchedule(undefined);
    let schedule = undefined;

    submitUpdate({schedule});
  };

  let submitSchedule = e => {
    e.preventDefault();
    if (scheduleCandidate) {
      let schedule = scheduleCandidate;
      setSchedule(scheduleCandidate);
      submitUpdate({schedule});
    }
  };

  let submit = async e => {
    e.preventDefault();
    await submitUpdate({
      name,
      description,
      color,
      logoURI,
      buttonURI,
      buttonText,
      closed,
      shareUrl,
    });
    close();
  };

  const [showAdvanced, setShowAdvanced] = useState(
    !!(room.logoURI || room.color)
  );
  let mqp = useMqParser();

  return (
    <Modal close={close}>
      <h1>Room Settings</h1>
      <br />
      <div>
        <form onSubmit={submit}>
          <input
            className={mqp(
              'rounded placeholder-gray-300 bg-gray-50 w-full md:w-96'
            )}
            type="text"
            placeholder="Room topic"
            value={name}
            name="jam-room-topic"
            aria-label="Room Topic"
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
            className={mqp(
              'rounded -mb-1 placeholder-gray-300 bg-gray-50 w-full md:w-full'
            )}
            placeholder="Room description"
            value={description}
            name="jam-room-description"
            aria-label="Room Description"
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
                className={mqp(
                  'rounded placeholder-gray-300 bg-gray-50 w-full md:w-full'
                )}
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
                className={mqp(
                  'rounded placeholder-gray-400 bg-gray-50 w-full md:w-full'
                )}
                type="text"
                placeholder="Button URI"
                value={buttonURI}
                name="jam-room-button-uri"
                autoComplete="off"
                onChange={e => {
                  setButtonURI(e.target.value);
                }}
              ></input>

              <br />
              <input
                className={mqp(
                  'rounded placeholder-gray-400 bg-gray-50 w-full md:w-96'
                )}
                type="text"
                placeholder="Share URL"
                value={shareUrl}
                name="jam-room-share-url"
                autoComplete="off"
                onChange={e => {
                  setShareUrl(e.target.value);
                }}
              ></input>
              <div className="p-2 text-gray-500 italic">
                The URL used for sharing the room.
                <span className="text-gray-400">(optional)</span>
              </div>

              <br />
              <hr />
              <br />
              <input
                className="ml-2"
                type="checkbox"
                name="jam-room-closed"
                aria-label={closed ? "Room is Closed" : "Room is Open"}
                id="jam-room-closed"
                onChange={() => {
                  setClosed(!closed);
                }}
                defaultChecked={closed}
              />

              <label className="pl-3 ml-0.5" htmlFor="jam-room-closed">
                Close the room (experimental){' '}
                <div className="p-2 pl-9 text-gray-500">
                  Closed rooms can only be joined by moderators.
                  <br />
                  Everyone else sees the description.
                </div>
              </label>
            </div>
          )}
          <div className="flex">
            <button
              onClick={submit}
              className="flex-grow mt-5 h-12 px-6 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600 mr-2"
              aria-label="Update Room Settings"
            >
              Update Room
            </button>
            <button
              onClick={close}
              className="mt-5 h-12 px-6 text-lg text-black bg-gray-100 rounded-lg focus:shadow-outline active:bg-gray-300"
              aria-label="Cancel"
              >
              Cancel
            </button>
          </div>
        </form>
        <br />
        <hr />
        <br />

        <form>
          <div className="pb-1">🗓 Room Schedule (experimental)</div>
          <div className="pb-3 text-gray-500">
            Set the date and time for an upcoming event.
          </div>

          <div className={schedule ? 'hidden' : 'w-full'}>
            <div className="flex">
              <input
                type="date"
                className="flex-grow p-2 border rounded"
                name="date"
                placeholder="yyyy-mm-dd"
                min={`${
                  new Date(new Date() - 86400000).toISOString().split('T')[0]
                }`}
                value={
                  scheduleCandidate?.date ||
                  `${new Date().toISOString().split('T')[0]}`
                }
                onChange={handleScheduleChange}
              />
              <input
                type="time"
                className="flex-none ml-3 p-2 border rounded"
                name="time"
                placeholder="hh:mm"
                value={scheduleCandidate?.time || ''}
                onChange={handleScheduleChange}
              />
            </div>
            <div
              className={
                showTimezoneSelect ? 'hidden' : 'p-2 pt-4 text-gray-500'
              }
            >
              {scheduleCandidate.timezone}{' '}
              <span
                className="underline"
                onClick={() => setShowTimezoneSelect(true)}
              >
                change
              </span>
            </div>
            <select
              name="timezone"
              defaultValue={scheduleCandidate.timezone}
              onChange={handleScheduleChange}
              className={
                showTimezoneSelect ? 'w-full border mt-3 p-2 rounded' : 'hidden'
              }
            >
              {rawTimeZones.map(tz => {
                return (
                  <option key={tz.rawFormat} value={tz.name}>
                    {tz.rawFormat}
                  </option>
                );
              })}
            </select>

            <div className={showRepeatSelect ? 'hidden' : 'p-2 text-gray-500'}>
              <span
                className="underline"
                onClick={() => setShowRepeatSelect(true)}
              >
                repeat?
              </span>
            </div>
            <select
              name="repeat"
              defaultValue="never"
              onChange={handleScheduleChange}
              className={
                showRepeatSelect ? 'border mt-3 p-2 rounded' : 'hidden'
              }
            >
              {['never', 'weekly', 'monthly'].map(rep => {
                return (
                  <option key={rep} value={rep}>
                    {rep}
                  </option>
                );
              })}
            </select>
          </div>

          <div
            className={schedule ? 'rounded bg-gray-50 border w-full' : 'hidden'}
          >
            <div className="text-gray-500 p-3">
              {schedule?.date} at {schedule?.time}
              <br />
              {schedule?.timezone}
              <br />
              {schedule?.repeat == 'weekly' || schedule?.repeat == 'monthly'
                ? schedule?.repeat
                : ''}
            </div>
            <div className={schedule ? 'p-3 text-gray-500' : 'hidden'}>
              <span onClick={removeSchedule} className="underline">
                Remove schedule
              </span>
            </div>
          </div>

          <div className={!schedule && completeSchedule() ? 'flex' : 'hidden'}>
            <button
              onClick={submitSchedule}
              className="flex-grow mt-5 h-12 px-6 text-lg text-white bg-gray-600 rounded-lg focus:shadow-outline active:bg-gray-600 mr-2"
            >
              Set Schedule
            </button>
          </div>
        </form>

        <br />
        <hr />
        <br />
      </div>
    </Modal>
  );
}
