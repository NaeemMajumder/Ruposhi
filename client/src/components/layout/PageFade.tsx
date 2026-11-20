'use client';
import { usePathname } from 'next/navigation';

/**
 * Each page eases in (fade + rise) on navigation.
 * Replaces (store)/template.tsx: a template.tsx and an error.tsx in the same route segment make Next.js log
 * "Each child in a list should have a unique key prop … OuterLayoutRouter" on every page in dev.
 * Keying by pathname re-mounts the wrapper exactly like a template did.
 */
export function PageFade({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div key={path} className="animate-page">
      {children}
    </div>
  );
}
