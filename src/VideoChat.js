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
  const [partnerId, setPartnerId] = useState(""); // Estado para almacenar el ID del compañero

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
    });

    socket.on('partnerId', (id) => {
      setPartnerId(id); // Actualiza el ID del compañero al recibirlo del servidor
    });
  }, []);

  const startPeer = (initiator) => {
    const newPeer = new Peer({ initiator, trickle: false, stream });

    newPeer.on('signal', (data) => {
      socket.emit('signal', { to: partnerId, signal: data }); // Usa el partnerId aquí
    });

    newPeer.on('stream', (userStream) => {
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = userStream;
      }
    });

    socket.on('signal', (signalData) => {
      newPeer.signal(signalData.signal);
    });

    setPeer(newPeer);
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
    </div>
  );
};

export default VideoChat;
