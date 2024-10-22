import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import io from 'socket.io-client';
import process from 'process'; // Importar polyfill para process

const socket = io("https://video-chat-backend2-becc66113081.herokuapp.com/", {
  transports: ["websocket"],
  secure: true
});

const VideoChat = () => {
  const [stream, setStream] = useState(null);
  const [me, setMe] = useState("");
  const [peer, setPeer] = useState(null);
  const myVideoRef = useRef();
  const userVideoRef = useRef();
  const [partnerId, setPartnerId] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Obtener el stream de video y audio
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      setStream(stream);
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }
    }).catch(err => console.error('Error al obtener el stream de medios:', err));

    // Escuchar el ID del socket actual
    socket.on('me', (id) => {
      setMe(id);
      socket.emit('join');
    });

    // Escuchar cuando se asigna un compañero
    socket.on('partnerId', (id) => {
      setPartnerId(id);
      if (!peer) {
        startPeer(true); // Iniciar la conexión P2P automáticamente
      }
    });

    // Escuchar señales del compañero
    socket.on('signal', (signalData) => {
      if (peer) {
        peer.signal(signalData.signal);
      }
    });

    // Escuchar mensajes de texto
    socket.on('message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      if (peer) peer.destroy();
    };
  }, [peer]);

  // Función para iniciar el Peer
  const startPeer = (initiator) => {
    const newPeer = new Peer({ initiator, trickle: false, stream });

    newPeer.on('signal', (data) => {
      socket.emit('signal', { to: partnerId, signal: data });
    });

    newPeer.on('stream', (userStream) => {
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = userStream;
      }
    });

    setPeer(newPeer);
  };

  // Función para enviar mensajes de texto
  const sendMessage = (message) => {
    socket.emit('message', message);
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  return (
    <div>
      <h1>Video Chat Automático</h1>
      <div>
        <video ref={myVideoRef} autoPlay muted style={{ width: '300px' }} />
        <video ref={userVideoRef} autoPlay style={{ width: '300px' }} />
      </div>
      <div>
        <h2>Chat de Texto</h2>
        <input 
          type="text" 
          placeholder="Escribe un mensaje..." 
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage(e.target.value);
              e.target.value = '';
            }
          }} 
        />
        <div>
          {messages.map((msg, index) => (
            <p key={index}>{msg}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoChat;
