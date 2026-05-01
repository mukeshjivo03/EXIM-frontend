import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { registerSW } from "virtual:pwa-register";

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      const shouldUpdate = window.confirm(
        "A new version is available. Reload now to update?"
      );
      if (shouldUpdate) {
        window.location.reload();
      }
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
