import localFont from 'next/font/local';

/**
 * Self-hosted brand fonts (from @fontsource, no Google request at runtime or build time).
 * Brand kit: Cormorant Garamond (display) · Playfair Display (headings) · DM Sans (body)
 *            Tiro Bangla (বাংলা display) · Hind Siliguri (বাংলা body)
 */
export const display = localFont({
  src: [
    { path: '../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2', weight: '500', style: 'italic' },
  ],
  variable: '--font-display',
  display: 'swap',
  preload: true,
});

export const heading = localFont({
  src: [{ path: '../../node_modules/@fontsource/playfair-display/files/playfair-display-latin-600-normal.woff2', weight: '600', style: 'normal' }],
  variable: '--font-heading',
  display: 'swap',
  preload: false,
});

export const body = localFont({
  src: [
    { path: '../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
  preload: true,
});

export const bnDisplay = localFont({
  src: [{ path: '../../node_modules/@fontsource/tiro-bangla/files/tiro-bangla-bengali-400-normal.woff2', weight: '400', style: 'normal' }],
  variable: '--font-bn-display',
  display: 'swap',
  preload: false,
});

export const bnBody = localFont({
  src: [
    { path: '../../node_modules/@fontsource/hind-siliguri/files/hind-siliguri-bengali-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/hind-siliguri/files/hind-siliguri-bengali-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-bn-body',
  display: 'swap',
  preload: false,
});

export const fontVars = [display.variable, heading.variable, body.variable, bnDisplay.variable, bnBody.variable].join(' ');
