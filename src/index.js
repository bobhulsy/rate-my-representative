import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Tailwind CSS (will be included via CDN in production)
import './styles.css';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);