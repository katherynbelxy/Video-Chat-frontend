import React from 'react';
import VideoChat from './VideoChat'; // Importa el componente de videochat
import './App.css'; // Importa los estilos

function App() {
  return (
    <div className="App">
      {/* Título de la aplicación */}
      <h1>Video Chat con Reconocimiento Facial</h1>
      
      {/* Componente de videochat */}
      <VideoChat />
    </div>
  );
}

export default App;
