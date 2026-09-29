import type { MetadataRoute } from 'next';

// Web-App-Manifest: Name und Icon beim „Zum Startbildschirm hinzufügen“ (Android/Chrome).
// iOS nutzt stattdessen app/apple-icon.png.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Auvryn',
    short_name: 'Auvryn',
    start_url: '/',
    display: 'standalone',
    background_color: '#080d16',
    theme_color: '#080d16',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
