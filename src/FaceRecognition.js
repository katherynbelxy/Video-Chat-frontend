import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

const FaceRecognition = () => {
  const [image, setImage] = useState(null); // Estado para la imagen cargada
  const [detections, setDetections] = useState(null); // Estado para las detecciones faciales
  const imageRef = useRef(null); // Referencia a la imagen cargada

  // Cargar los modelos cuando el componente se monte
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Cargar los modelos desde la carpeta /models
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        console.log('Modelos cargados correctamente');
      } catch (error) {
        console.error('Error al cargar los modelos:', error);
      }
    };

    loadModels();
  }, []); // Se ejecuta solo una vez cuando el componente se monta

  // Manejar la carga de la imagen y realizar detección facial
  const handleImageUpload = async (event) => {
    const file = event.target.files[0]; // Obtener el archivo de imagen
    setImage(URL.createObjectURL(file)); // Mostrar la imagen seleccionada

    // Esperar a que la imagen esté completamente cargada antes de detectar
    if (imageRef.current) {
      const imgElement = imageRef.current;

      imgElement.onload = async () => {
        try {
          // Realizar la detección facial
          const detections = await faceapi.detectAllFaces(imgElement)
            .withFaceLandmarks()
            .withFaceDescriptors();
          
          setDetections(detections); // Guardar detecciones en el estado
          console.log(detections);  // Mostrar los resultados en la consola
        } catch (error) {
          console.error('Error durante la detección facial:', error);
        }
      };
    }
  };

  return (
    <div>
      <h1>Reconocimiento de Personas</h1>
      <input type="file" accept="image/*" onChange={handleImageUpload} /> {/* Input para cargar la imagen */}
      {image && ( // Mostrar la imagen seleccionada si existe
        <img ref={imageRef} src={image} alt="Uploaded" style={{ width: '300px' }} />
      )}
      {detections && ( // Mostrar las detecciones si existen
        <div>
          <h2>Detecciones:</h2>
          <pre>{JSON.stringify(detections, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default FaceRecognition;
