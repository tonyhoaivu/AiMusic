// Ensure window.fetch is writable and configurable in all environments
try {
  if (typeof window !== 'undefined') {
    let _f = window.fetch ? window.fetch.bind(window) : undefined;
    const desc = {
      get: () => _f,
      set: (n: typeof fetch) => { _f = n; },
      configurable: true,
      enumerable: true,
    };
    try { Object.defineProperty(window, 'fetch', desc); } catch (_) {}
    if (typeof Window !== 'undefined' && Window.prototype) {
      try { Object.defineProperty(Window.prototype, 'fetch', desc); } catch (_) {}
    }
  }
} catch (_) {}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
