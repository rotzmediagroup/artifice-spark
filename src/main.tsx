import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'

// Register service worker for PWA functionality with cache clearing
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Clear all caches first
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('All caches cleared');
      }

      // Unregister any existing service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
      console.log('All service workers unregistered');

      // Register fresh service worker
      const registration = await navigator.serviceWorker.register('/sw.js', { 
        scope: '/',
        updateViaCache: 'none' // Prevent SW caching
      });
      console.log('SW registered fresh: ', registration);
      
      // Force immediate update
      if (registration.waiting) {
        registration.waiting.postMessage({type: 'SKIP_WAITING'});
      }
    } catch (error) {
      console.log('SW registration/cache clearing failed: ', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
