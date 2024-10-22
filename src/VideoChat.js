import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import * as faceapi from 'face-api.js';
import io from 'socket.io-client';

// Cambia la URL aquí según dónde esté tu backend
const socket = io("https://video-chat-backend2-becc66113081.herokuapp.com/", {
  transports: ["websocket"],
  secure: true
});

const VideoChat = () => {
  const [stream, setStream] = useState(null);
  const [me, setMe] = useState("");
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const myVideoRef = useRef();
  const userVideoRef = useRef();
  const [detections, setDetections] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [partnerId, setPartnerId] = useState("");

  const loadModels = async () => {
    console.log('Cargando modelos de face-api...');
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    setModelsLoaded(true);
    console.log('Modelos cargados');
  };

  useEffect(() => {
    loadModels();

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        console.log('Stream de medios obtenido');
        setStream(stream);
        myVideoRef.current.srcObject = stream;
        socket.emit('join'); // Emitir evento join al conectarse
      })
      .catch(err => {
        console.error('Error al obtener el stream de medios:', err);
      });

    socket.on('me', (id) => {
      console.log('ID del usuario conectado:', id);
      setMe(id);
    });

    socket.on('partnerId', (id) => {
      console.log('Partner ID recibido:', id);
      setPartnerId(id);
      startPeer(true); // Inicia el peer directamente
    });

    socket.on('message', (message) => {
      console.log('Mensaje recibido:', message);
      setMessages(prevMessages => [...prevMessages, message]);
    });

    socket.on('user-disconnected', (id) => {
      console.log('Usuario desconectado:', id);
    });

    return () => {
      if (peer) peer.destroy();
    };
  }, []);

  useEffect(() => {
    const detectFaces = async () => {
      if (myVideoRef.current && stream) {
        const detections = await faceapi.detectAllFaces(
          myVideoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptors();
        setDetections(detections);
        console.log('Detecciones de rostro:', detections);
      }
    };

    const interval = setInterval(() => {
      if (modelsLoaded) detectFaces();
    }, 100);

    return () => clearInterval(interval);
  }, [stream, modelsLoaded]);

  const startPeer = (initiator) => {
    console.log('Iniciando peer, iniciador:', initiator);
    const newPeer = new Peer({ initiator, trickle: false, stream });

    newPeer.on('signal', (data) => {
      console.log('Señal enviada:', data);
      socket.emit('signal', { to: partnerId, signal: data });
    });

    newPeer.on('stream', (userStream) => {
      console.log('Stream del usuario recibido');
      userVideoRef.current.srcObject = userStream;
    });

    socket.on('signal', (signalData) => {
      console.log('Señal recibida de:', signalData.from);
      newPeer.signal(signalData.signal);
    });

    setPeer(newPeer);
  };

  const sendMessage = (message) => {
    console.log('Enviando mensaje:', message);
    socket.emit('message', message);
    setMessages(prevMessages => [...prevMessages, message]);
  };

  return (
    <div>
      <h1>Video Chat con Reconocimiento Facial</h1>
      <video ref={myVideoRef} autoPlay muted style={{ width: '300px' }} />
      <video ref={userVideoRef} autoPlay style={{ width: '300px' }} />
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
      {detections && (
        <div>
          <h2>Detecciones:</h2>
          <pre>{JSON.stringify(detections, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default VideoChat;
