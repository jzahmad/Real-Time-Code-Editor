import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate, Navigate, useParams } from 'react-router-dom';
import { initSocket } from '../socket';
import Client from '../components/Client';
import Editor from '../components/Editor';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef('');
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();

            // Handle connection error
            socketRef.current.onclose = (error) => {
                console.log('Disconnected. Error:', error);
                toast.error('Connection lost. Please try again later.');
                reactNavigator('/');
            };

            // Join room
            socketRef.current.invoke('JoinRoom', roomId, location.state.username)
                .catch(err => {
                    console.error('Error joining room:', err);
                    toast.error('Could not join the room.');
                });

           
            // Listen for joined event
            socketRef.current.on('UserJoined', (data, username, socketId) => {
                console.log(data);
                if (username !== location.state?.username) {
                    toast.success(`${data.username} joined the room.`);
                }
                setClients(data.clients);

                socketRef.current.invoke('SyncCode', codeRef.current, socketId)
                    .catch(err => console.error('Error syncing code:', err));
            });

            
            // Listen for code changes
            socketRef.current.on('CodeChanged', (code) => {
                if (code !== null) {
                    codeRef.current = code;
                    if (Editor.current) {
                        Editor.current.setValue(code);
                    }
                }
            });

            // Handle disconnect
            socketRef.current.on('UserLeft', (socketId, username) => {
                toast.success(`${username} left the room.`);
                setClients((prev) => prev.filter((client) => client.socketId !== socketId));
            });
        };

        init();

        return () => {
            if (socketRef.current) {
                socketRef.current.stop();
            }
        };
    }, [roomId, location.state, reactNavigator]);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/code-sync.png"
                            alt="logo"
                        />
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorWrap">
                <Editor
                    socketRef={socketRef}
                    roomId={roomId}
                    onCodeChange={(code) => {
                        codeRef.current = code;
                    }}
                />
            </div>
        </div>
    );
};

export default EditorPage;
