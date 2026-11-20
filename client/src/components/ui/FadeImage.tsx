'use client';
import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/format';

/**
 * next/image that "develops in" (blur → sharp, slight zoom-out) once decoded.
 * Pair the parent with `.media` for a shimmer placeholder. Priority (LCP) images skip the fade
 * so Largest Contentful Paint is never delayed.
 */
export function FadeImage({ className, onLoad, priority, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  if (priority) return <Image {...props} priority className={className} onLoad={onLoad} />;
  return (
    <Image
      {...props}
      className={cn('fade-img', className)}
      data-loaded={loaded}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      ref={(el) => {
        if (el?.complete && el.naturalWidth > 0 && !loaded) setLoaded(true);
      }}
    />
  );
}
