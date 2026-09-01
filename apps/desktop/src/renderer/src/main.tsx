import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/oxanium';
import App from './App';
import './styles/global.css';
import './styles/forge-os.css';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
