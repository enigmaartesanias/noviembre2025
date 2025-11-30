import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/styles.css'; // Tus otros estilos globales
import './styles/index.css'; // Tailwind

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);