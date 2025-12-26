import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// SRS §7.3.7 / §10.2.1: Demo Mode must never run in production.
if (
  import.meta.env.VITE_ENV === 'production' &&
  import.meta.env.VITE_DEMO_MODE === 'true'
) {
  throw new Error('FATAL: Demo Mode cannot run in production');
}

/**
 * Initialize MSW Worker for Demo Mode
 * SRS §10.2.1: MSW must be active when VITE_DEMO_MODE=true
 */
async function enableMocking() {
  if (import.meta.env.VITE_DEMO_MODE !== 'true') {
    return;
  }

  const { worker } = await import('./mocks/browser');

  // Start MSW worker
  // onUnhandledRequest: 'bypass' allows non-mocked requests to pass through
  // (useful if some requests should hit real backend)
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });
}

// Initialize MSW before rendering React app
enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
