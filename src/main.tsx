import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { API_CONFIG } from './config/api'

// Set favicon from backend URL based on environment
const setFavicon = () => {
  const favicon = document.getElementById('favicon') as HTMLLinkElement;
  if (favicon) {
    const backendUrl = API_CONFIG.BACKEND_URL;
    // URL đúng format: /api/v0/files/assets/logo/logo.png
    favicon.href = `${backendUrl}/api/v0/files/assets/logo/logo.png`;
  }
};

// Set favicon immediately
setFavicon();

createRoot(document.getElementById("root")!).render(<App />);
