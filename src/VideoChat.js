import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import * as faceapi from 'face-api.js';
import io from 'socket.io-client';

// const socket = io.connect('http://localhost:5000');
const socket = io.connect('https://glrtzw7g-5000.use2.devtunnels.ms'); // URL del backend



const VideoChat = () => {
  const [stream, setStream] = useState(null);
  const [me, setMe] = useState("");
  const [peer, setPeer] = useState(null);
  const myVideoRef = useRef();
  const userVideoRef = useRef();
  const [detections, setDetections] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false); // Estado para controlar la carga de modelos

  // Cargar los modelos de face-api.js
  const loadModels = async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    setModelsLoaded(true); // Cambiar el estado a true una vez que los modelos se hayan cargado
    console.log('Modelos cargados');
  };

  useEffect(() => {
    loadModels(); // Llama a loadModels al montar el componente

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      setStream(stream);
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }
    });

    socket.on('me', (id) => {
      setMe(id);
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
      socket.emit('signal', { to: "partner-id", signal: data });
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
