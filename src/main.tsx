import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/noto-sans-arabic/wght.css';
import '@fontsource-variable/manrope/wght.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
// V11 Arabic / Sorani display face (SIL OFL): editorial Naskh for titles; UI text stays Noto Sans Arabic
import '@fontsource/noto-naskh-arabic/arabic-500.css';
import '@fontsource/noto-naskh-arabic/arabic-600.css';
import './styles/app.css';
import { App } from './App';
import { initRouting, useStore } from './state/store';

// returning visitor in the same session: no forced intro
try { if (sessionStorage.getItem('nakhla.entered')) useStore.setState({ landing: false }); } catch { /* ignore */ }
initRouting();
if (/[?&]hud=1/.test(location.search)) useStore.setState({ hud: true });
// read-only test hook for the store (the photo site runs without the 3D engine)
if (import.meta.env.DEV || /[?&](hud|e2e)=1/.test(location.search)) (window as unknown as { __nakhlaStore: unknown }).__nakhlaStore = useStore;

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
