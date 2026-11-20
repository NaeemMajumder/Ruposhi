'use client';
/** Last-resort boundary (root layout failed) — must render its own <html>. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', background: '#FFF9F5', color: '#2C1810', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontWeight: 500 }}>Something went wrong.</h1>
          <button onClick={reset} style={{ marginTop: 16, padding: '12px 24px', borderRadius: 999, border: 0, background: '#2C1810', color: '#FFF9F5', cursor: 'pointer' }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
