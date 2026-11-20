import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ruposhi — Premium Ethnic Wear',
    short_name: 'Ruposhi',
    description: 'Sarees, panjabis, salwar kameez and kurtis — shown exactly as they are.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF9F5',
    theme_color: '#2C1810',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
