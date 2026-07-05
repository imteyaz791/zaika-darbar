// This file registers the service worker that makes the app installable (PWA)
// and enables basic offline caching for static assets.

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Zaika Darbar: Service worker registered:', registration.scope);
        })
        .catch((error) => {
          console.log('Zaika Darbar: Service worker registration failed:', error);
        });
    });
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
