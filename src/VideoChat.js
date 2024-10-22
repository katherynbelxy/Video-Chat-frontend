import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const VideoChat = () => {
  const [me, setMe] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [stream, setStream] = useState(null);
  const myVideo = useRef();
  const userVideo = useRef();
  const peerInstance = useRef(null);

  useEffect(() => {
    // Obtener el flujo de video
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }
    });

    // Crear la instancia de PeerJS
    const peer = new Peer(undefined, {
      path: '/peerjs',
      host: 'localhost',
      port: 5000,
    });

    peerInstance.current = peer;

    peer.on('open', (id) => {
      setMe(id);
      socket.emit('join', id);
    });

    socket.on('partnerId', (partnerId) => {
      setPartnerId(partnerId);
    });

    peer.on('call', (call) => {
      call.answer(stream);
      call.on('stream', (userStream) => {
        userVideo.current.srcObject = userStream;
      });
    });
  }, [stream]);

  const callUser = (id) => {
    const call = peerInstance.current.call(id, stream);
    call.on('stream', (userStream) => {
      userVideo.current.srcObject = userStream;
    });
  };

  return (
    <div>
      <h1>Video Chat si</h1>
      <video playsInline muted ref={myVideo} autoPlay style={{ width: '300px' }} />
      <video playsInline ref={userVideo} autoPlay style={{ width: '300px' }} />

      {partnerId && (
        <button onClick={() => callUser(partnerId)}>Llamar a {partnerId}</button>
      )}
    </div>
  );
};

export default VideoChat;
