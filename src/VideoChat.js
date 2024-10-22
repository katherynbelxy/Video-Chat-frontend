import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

// Conectar con el servidor de socket.io en Heroku
const socket = io('https://video-chat-backend2-becc66113081.herokuapp.com/');

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

    // Crear la instancia de PeerJS conectada a tu servidor en Heroku
    const peer = new Peer(undefined, {
      host: 'video-chat-backend2-becc66113081.herokuapp.com',
      port: 443,
      path: '/peerjs',
      secure: true,
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
      call.answer(stream); // Contestar la llamada con el flujo de video
      call.on('stream', (userStream) => {
        userVideo.current.srcObject = userStream;
      });
    });
  }, [stream]);

  const callUser = (id) => {
    const call = peerInstance.current.call(id, stream); // Llamar al usuario
    call.on('stream', (userStream) => {
      userVideo.current.srcObject = userStream;
    });
  };

  return (
    <div>
      <h1>Video Chat</h1>
      <video playsInline muted ref={myVideo} autoPlay style={{ width: '300px' }} />
      <video playsInline ref={userVideo} autoPlay style={{ width: '300px' }} />

      {partnerId && (
        <button onClick={() => callUser(partnerId)}>Llamar a {partnerId}</button>
      )}
    </div>
  );
};

export default VideoChat;
