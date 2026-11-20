'use client';
import { usePathname } from 'next/navigation';

export function WhatsAppButton({ number, label }: { number: string; label: string }) {
  const path = usePathname();
  if (path.startsWith('/checkout')) return null;
  const text = encodeURIComponent('Hi Ruposhi! I have a question about a product.');
  const onProduct = path.startsWith('/product/');
  return (
    <a
      href={`https://wa.me/${number.replace(/\D/g, '')}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`WhatsApp — ${label}`}
      className={`fixed right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#1f7a4d] text-white shadow-lg transition hover:scale-110 active:scale-95 animate-[bump_.6s_var(--ease-out-back)_1.2s_both] lg:bottom-6 ${onProduct ? 'bottom-24' : 'bottom-20'}`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.04c-.24.68-1.42 1.3-1.95 1.35-.5.05-.98.24-3.31-.69-2.8-1.11-4.6-3.98-4.74-4.17-.14-.18-1.13-1.5-1.13-2.87 0-1.36.71-2.03.97-2.31.25-.27.55-.34.73-.34h.53c.17 0 .4-.06.62.48.24.56.8 1.94.87 2.08.07.14.11.3.02.48-.1.18-.14.3-.28.46-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.27.73 1.2 1.56 1.94 1.07.96 1.98 1.25 2.25 1.4.28.14.44.11.6-.07.17-.18.7-.81.88-1.09.18-.28.37-.23.62-.14.25.09 1.6.76 1.88.89.27.14.45.2.52.32.07.11.07.66-.17 1.33Z" />
      </svg>
    </a>
  );
}
