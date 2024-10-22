import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import * as faceapi from 'face-api.js';
import io from 'socket.io-client';

const socket = io("https://video-chat-backend2-becc66113081.herokuapp.com/", {
  transports: ["websocket"],
  secure: true
});

const VideoChat = () => {
  const [stream, setStream] = useState(null);
  const [me, setMe] = useState("");
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]); // Estado para almacenar mensajes
  const myVideoRef = useRef();
  const userVideoRef = useRef();
  const [detections, setDetections] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [partnerId, setPartnerId] = useState("");

  // Cargar los modelos de face-api.js
  const loadModels = async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    setModelsLoaded(true);
    console.log('Modelos cargados');
  };

  useEffect(() => {
    loadModels();

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      setStream(stream);
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }
    });

    socket.on('me', (id) => {
      setMe(id);
      socket.emit('join'); // Emitir evento 'join' al conectarse
    });

    socket.on('partnerId', (id) => {
      setPartnerId(id);
      console.log('Partner ID recibido:', id);
    });

    // Escuchar mensajes
    socket.on('message', (message) => {
      setMessages(prevMessages => [...prevMessages, message]);
    });

  }, []);

  // Detectar rostros en tiempo real solo si los modelos están cargados
  useEffect(() => {
    const detectFaces = async () => {
      if (myVideoRef.current && stream) {
        const detections = await faceapi.detectAllFaces(
          myVideoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptors();
        setDetections(detections);
      }
    };

    const interval = setInterval(() => {
      if (modelsLoaded) {
        detectFaces(); // Ejecutar la detección solo si los modelos están cargados
      }
    }, 100);

    return () => clearInterval(interval);
  }, [stream, modelsLoaded]);

  const startPeer = (initiator) => {
    const newPeer = new Peer({ initiator, trickle: false, stream });

    newPeer.on('signal', (data) => {
      console.log('Enviando señal:', data);
      socket.emit('signal', { to: partnerId, signal: data });
    });

    newPeer.on('stream', (userStream) => {
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = userStream; // Asignar el flujo del compañero al video
      }
    });

    socket.on('signal', (signalData) => {
      newPeer.signal(signalData.signal);
    });

    setPeer(newPeer);
  };

  const sendMessage = (message) => {
    socket.emit('message', message); // Enviar el mensaje al backend
    setMessages(prevMessages => [...prevMessages, message]); // Agregar el mensaje a la lista local
  };

  return (
    <div>
      <h1>Final Video Chat con Reconocimiento Facial</h1>

      <video ref={myVideoRef} autoPlay muted style={{ width: '300px' }} />
      <video ref={userVideoRef} autoPlay style={{ width: '300px' }} />

      <button onClick={() => startPeer(true)}>Iniciar llamada</button>
      <button onClick={() => startPeer(false)}>Unirse a llamada</button>

      <div>
        <h2>Chat de Texto</h2>
        <input 
          type="text" 
          placeholder="Escribe un mensaje..." 
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage(e.target.value);
              e.target.value = ''; // Limpiar el input después de enviar
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
