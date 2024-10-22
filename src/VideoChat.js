import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

const socket = io("https://video-chat-backend2-becc66113081.herokuapp.com/", {
  transports: ["websocket"],
  secure: true,
});

const VideoChat = () => {
  const [stream, setStream] = useState(null);
  const [me, setMe] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const myVideoRef = useRef();
  const userVideoRef = useRef();
  const peerInstance = useRef(null);

  useEffect(() => {
    // Obtener acceso a la cámara y micrófono
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      setStream(stream);
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }
    });

    // Inicializar PeerJS y establecer conexión
    const peer = new Peer();
    peerInstance.current = peer;

    // Obtener el ID propio y conectarse al socket
    peer.on('open', id => {
      setMe(id);
      console.log('Mi Peer ID:', id);
      socket.emit('join', id);  // Enviar el ID al servidor
    });

    // Escuchar el ID del compañero desde el servidor
    socket.on('partnerId', (id) => {
      setPartnerId(id);
      console.log('Partner ID recibido:', id);
    });

    // Manejar la recepción de llamada
    peer.on('call', (call) => {
      call.answer(stream); // Responder la llamada con tu propio stream
      call.on('stream', (userStream) => {
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = userStream;
        }
      });
    });

    // Cleanup en el unmount
    return () => {
      if (peerInstance.current) {
        peerInstance.current.destroy();
      }
    };
  }, [stream]);

  const startCall = () => {
    if (partnerId && peerInstance.current) {
      const call = peerInstance.current.call(partnerId, stream); // Llamar al compañero
      call.on('stream', (userStream) => {
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = userStream;
        }
      });
    }
  };

  return (
    <div>
      <h1>Video Chat con PeerJS</h1>

      <video ref={myVideoRef} autoPlay muted style={{ width: '300px' }} />
      <video ref={userVideoRef} autoPlay style={{ width: '300px' }} />

      <button onClick={startCall}>Iniciar llamada</button>

      <p>Mi ID: {me}</p>
      <p>ID del compañero: {partnerId}</p>
    </div>
  );
};

export default VideoChat;
