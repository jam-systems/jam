import React, {useMemo} from 'react';
import {render} from 'react-dom';
import {usePath} from './lib/use-location';
import Jam from './Jam';
import Start from './views/Start';
import Me from './views/Me';
import {parseUrlConfig} from './lib/url-utils';
import {importRoomIdentity} from './logic/identity';
import {initializeIdentity} from './logic/backend';

render(<App/>, document.querySelector('#root'));

function App() {
    // detect roomId from URL
    const [firstPathElement = null] = usePath();
    switch (firstPathElement) {
        case "me":
            return <Me/>;
        default:
            const roomId = firstPathElement;
            const urlData = useMemo(() => {
                let data = parseUrlConfig();
                if (roomId !== null && data.identity) {
                    importRoomIdentity(roomId, data.identity, data.keys);
                    initializeIdentity(roomId);
                }
                return data;
            }, [roomId]);

            return (
                <Jam
                    style={{height: '100vh'}}
                    roomId={roomId}
                    newRoom={urlData.room}
                    onError={({error}) => {
                        return (
                            <Start urlRoomId={roomId} roomFromURIError={!!error.createRoom}/>
                        );
                    }}
                />
            );
    }
}
