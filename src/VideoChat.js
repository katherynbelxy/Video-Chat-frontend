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
  const myVideoRef = useRef();
  const userVideoRef = useRef();
  const [detections, setDetections] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [partnerId, setPartnerId] = useState(""); // Almacena el ID del compañero
  const [messages, setMessages] = useState([]); // Almacena los mensajes
  const [messageInput, setMessageInput] = useState(""); // Almacena el mensaje actual

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

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setStream(stream);
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream; // Mostrar el video propio
        }
      })
      .catch(err => {
        console.error('Error al acceder a la cámara y el micrófono:', err);
      });

    // Obtén el ID del usuario al conectarse
    socket.on('me', (id) => {
      setMe(id);
      socket.emit('join'); // Emitir evento 'join' al conectarse
    });

    // Escuchar el ID del compañero
    socket.on('partnerId', (id) => {
      setPartnerId(id);
      console.log('Partner ID recibido:', id);
    });

    // Escuchar mensajes entrantes
    socket.on('message', (message) => {
      setMessages(prevMessages => [...prevMessages, message]);
    });

    // Limpiar el socket al desmontar el componente
    return () => {
      socket.off('me');
      socket.off('partnerId');
      socket.off('message');
    };
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
      socket.emit('signal', { to: partnerId, signal: data }); // Usar partnerId
    });

    newPeer.on('stream', (userStream) => {
      console.log('Flujo de usuario recibido:', userStream);
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = userStream; // Asignar el flujo del compañero al video
      }
    });

    socket.on('signal', (signalData) => {
      console.log('Signal recibido de:', signalData.from);
      newPeer.signal(signalData.signal);
    });

    setPeer(newPeer);
  };

  const sendMessage = () => {
    if (messageInput.trim() !== "") {
      const message = { sender: me, text: messageInput };
      socket.emit('message', message);
      setMessages(prevMessages => [...prevMessages, message]);
      setMessageInput(""); // Limpiar el campo de entrada
    }
  };

  return (
    <div>
      <h1>Video Chat con Reconocimiento Facial</h1>

      <video ref={myVideoRef} autoPlay muted style={{ width: '300px' }} />
      <video ref={userVideoRef} autoPlay style={{ width: '300px' }} />

      <button onClick={() => startPeer(true)}>Iniciar llamada</button>
      <button onClick={() => startPeer(false)}>Unirse a llamada</button>

      {detections && (
        <div>
          <h2>Detecciones:</h2>
          <pre>{JSON.stringify(detections, null, 2)}</pre>
        </div>
      )}

      <div>
        <h2>Chat</h2>
        <div style={{ border: '1px solid #ccc', padding: '10px', height: '200px', overflowY: 'scroll' }}>
          {messages.map((msg, index) => (
            <div key={index}>
              <strong>{msg.sender}: </strong>{msg.text}
            </div>
          ))}
        </div>
        <input 
          type="text" 
          value={messageInput} 
          onChange={(e) => setMessageInput(e.target.value)} 
          placeholder="Escribe un mensaje..." 
        />
        <button onClick={sendMessage}>Enviar</button>
      </div>
    </div>
  );
};

export default VideoChat;
