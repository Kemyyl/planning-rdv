import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import './index.css';
import './i18n';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: { fontFamily: 'DM Sans, sans-serif', borderRadius: '14px', background: '#FFFDFA', color: '#0A1D35', border: '1px solid #E7DCCD' },
        success: { iconTheme: { primary: '#1E6B4A', secondary: '#DCEFE4' } },
        error: { iconTheme: { primary: '#9B2C1F', secondary: '#F7DDD8' } },
      }}
    />
  </StrictMode>
);
