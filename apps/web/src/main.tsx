import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@cutepad/ui/styles.css';
import './styles.css';
import App from './App';
import { startAutoSync } from '@cutepad/core';

startAutoSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
