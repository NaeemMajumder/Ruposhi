'use client';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, Pause, Play, X } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cn, tr } from '@/lib/format';
import type { Product } from '@/lib/types';
import { youtubeEmbed, youtubeId, youtubeThumb } from '@/lib/youtube';

/**
 * Product media:
 * - mobile: swipeable scroll-snap carousel with dot indicator
 * - desktop: vertical thumbs + main image with hover zoom (follows cursor)
 * - lightbox: full-screen, keyboard ← → / Esc, swipe
 * - motion film: the product's YouTube video when `videoUrl` is set (click-to-play, privacy-enhanced),
 *   otherwise a cinematic Ken-Burns film of the photos
 */
export function Gallery({ p, badge }: { p: Product; badge?: React.ReactNode }) {
  const { lang, t } = useT();
  const imgs = p.images;
  const slides = imgs.length + 1; // last slide = motion film
  const hasYt = !!youtubeId(p.videoUrl);
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const rail = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (n: number) => {
      const next = (n + slides) % slides;
      setI(next);
      const el = rail.current;
      if (el && el.offsetParent !== null) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    },
    [slides],
  );

  // keep dots in sync while the user swipes on mobile
  const onScroll = () => {
    const el = rail.current;
    if (!el) return;
    const n = Math.round(el.scrollLeft / el.clientWidth);
    if (n !== i) setI(n);
  };

  const alt = (k: number) => tr(imgs[k]?.alt, lang) || tr(p.name, lang);
  const isFilm = i === imgs.length;

  return (
    <div className="lg:sticky lg:top-24">
      <div className="grid gap-3 lg:grid-cols-[84px_1fr]">
        {/* thumbnails (desktop) */}
        <div className="hidden flex-col gap-2 lg:flex" role="tablist" aria-label="Product images">
          {imgs.map((im, k) => (
            <button key={k} role="tab" aria-selected={i === k} aria-label={`Image ${k + 1}`} onClick={() => go(k)} className={cn('media relative aspect-[3/4] overflow-hidden rounded-xl ring-offset-2 ring-offset-cream transition', i === k ? 'ring-2 ring-espresso' : 'opacity-70 hover:opacity-100')}>
              <Image src={im.url} alt="" fill sizes="84px" quality={60} className="object-cover" />
            </button>
          ))}
          <button role="tab" aria-selected={isFilm} onClick={() => go(imgs.length)} className={cn('media relative grid aspect-[3/4] place-items-center overflow-hidden rounded-xl ring-offset-2 ring-offset-cream transition', isFilm ? 'ring-2 ring-espresso' : 'opacity-80 hover:opacity-100')} aria-label={t('product.video')}>
            <Image src={imgs[1]?.url ?? imgs[0].url} alt="" fill sizes="84px" quality={60} className="object-cover brightness-75" />
            <span className="relative grid h-9 w-9 place-items-center rounded-full bg-ivory/90 text-night"><Play className="h-4 w-4 translate-x-px fill-current" /></span>
          </button>
        </div>

        {/* main stage */}
        <div className="relative">
          {/* mobile swipe rail */}
          <div ref={rail} onScroll={onScroll} className="scrollbar-none -mx-4 flex snap-x snap-mandatory overflow-x-auto sm:mx-0 sm:rounded-3xl lg:hidden">
            {imgs.map((im, k) => (
              <button key={k} onClick={() => setLightbox(true)} className="media relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden" aria-label={`${alt(k)} — zoom`}>
                <Image src={im.url} alt={alt(k)} fill priority={k === 0} fetchPriority={k === 0 ? 'high' : undefined} sizes="(max-width: 1023px) 100vw, 16px" quality={75} className="object-cover" />
              </button>
            ))}
            <div className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-night">
              <MotionFilm p={p} active={isFilm} />
            </div>
          </div>

          {/* desktop stage with hover zoom */}
          <div className="media relative hidden aspect-[4/5] overflow-hidden rounded-3xl lg:block">
            {imgs.map((im, k) => (
              <div
                key={k}
                className={cn('absolute inset-0 cursor-zoom-in transition-opacity duration-700 ease-[var(--ease-silk)]', i === k ? 'opacity-100' : 'pointer-events-none opacity-0')}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
                }}
                onMouseLeave={() => setZoom(null)}
                onClick={() => setLightbox(true)}
              >
                <Image
                  src={im.url}
                  alt={alt(k)}
                  fill
                  priority={k === 0}
                  sizes="(max-width: 1320px) 50vw, 640px"
                  quality={85}
                  className="object-cover transition-transform duration-300 ease-out will-change-transform"
                  style={i === k && zoom ? { transform: 'scale(1.9)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
                />
              </div>
            ))}
            <div className={cn('absolute inset-0 bg-night transition-opacity duration-700', isFilm ? 'opacity-100' : 'pointer-events-none opacity-0')}>
              <MotionFilm p={p} active={isFilm} />
            </div>
            {/* photo overlays step aside on the YouTube slide so they never cover the player's own controls */}
            {!(isFilm && hasYt) && (
              <button onClick={() => setLightbox(true)} className="absolute bottom-4 right-4 grid h-11 w-11 animate-fade place-items-center rounded-full bg-cream/90 shadow backdrop-blur transition hover:scale-110" aria-label="Full screen">
                <Expand className="h-4 w-4" />
              </button>
            )}
          </div>
          {badge && !(isFilm && hasYt) && <div className="pointer-events-none absolute left-3 top-3 animate-fade lg:left-4 lg:top-4">{badge}</div>}

          {/* dots (mobile) */}
          <div className="mt-3 flex items-center justify-center gap-1.5 lg:hidden" aria-hidden="true">
            {Array.from({ length: slides }, (_, k) => (
              <span key={k} className={cn('h-1.5 rounded-full transition-all duration-500 ease-[var(--ease-silk)]', i === k ? 'w-6 bg-espresso' : 'w-1.5 bg-line')} />
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-mocha">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> {t('product.videoNote')}
          </p>
        </div>
      </div>

      <Lightbox open={lightbox} onOpenChange={setLightbox} p={p} index={Math.min(i, imgs.length - 1)} onIndex={(n) => go(n)} />
    </div>
  );
}

/** YouTube video if linked; otherwise a looping cinematic film made from the product photos. */
function MotionFilm({ p, active }: { p: Product; active: boolean }) {
  const { t } = useT();
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useState(0);
  const imgs = p.images;
  const yt = youtubeId(p.videoUrl);

  useEffect(() => {
    if (yt || !active || !playing || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % imgs.length), 3200);
    return () => clearInterval(id);
  }, [yt, active, playing, imgs.length]);

  if (yt) return <YouTubeFilm id={yt} active={active} title={`${tr(p.name, 'en')} — ${t('product.video')}`} label={t('product.video')} />;

  return (
    <div className="absolute inset-0 overflow-hidden" aria-label={t('product.video')} role="img">
      {active &&
        imgs.map((im, k) => (
          <div key={k} className={cn('absolute inset-0 transition-opacity duration-[1400ms] ease-in-out', frame === k ? 'opacity-100' : 'opacity-0')}>
            <Image
              src={im.url}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 640px"
              quality={75}
              className="object-cover"
              style={{ animation: frame === k && playing ? `kenburns-${k % 2} 6.5s ease-out both` : undefined }}
            />
          </div>
        ))}
      <div className="absolute inset-0 bg-gradient-to-t from-night/70 via-transparent to-night/20" />
      <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-night/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ivory backdrop-blur">
        <span className={cn('h-2 w-2 rounded-full bg-[#ff5a5a]', playing && 'animate-pulse')} /> Motion · {t('product.video')}
      </div>
      {/* progress segments */}
      <div className="absolute inset-x-4 top-14 flex gap-1">
        {imgs.map((_, k) => (
          <span key={k} className="h-0.5 flex-1 overflow-hidden rounded-full bg-ivory/30">
            <span className="block h-full origin-left bg-ivory" style={{ transform: k < frame ? 'scaleX(1)' : 'scaleX(0)', animation: k === frame && playing && active ? 'progress 3.2s linear forwards' : undefined }} />
          </span>
        ))}
      </div>
      <FilmControls playing={playing} onToggle={() => setPlaying((x) => !x)} />
    </div>
  );
}

/**
 * Lightweight YouTube "facade": only a thumbnail until the shopper taps play, so the page stays fast
 * (the YouTube player is ~1 MB). Leaving the slide unmounts the player, which stops playback.
 */
function YouTubeFilm({ id, active, title, label }: { id: string; active: boolean; title: string; label: string }) {
  const [play, setPlay] = useState(false);
  useEffect(() => {
    if (!active) setPlay(false);
  }, [active]);
  if (play && active)
    return <iframe src={youtubeEmbed(id)} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 h-full w-full border-0 bg-night" />;
  return (
    <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0 overflow-hidden bg-night" aria-label={`▶ ${label}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={youtubeThumb(id)} alt="" loading="lazy" decoding="async" className="h-full w-full scale-110 object-cover opacity-90 transition duration-700 group-hover:scale-[1.14]" />
      <span className="absolute inset-0 bg-gradient-to-t from-night/70 via-transparent to-night/20" />
      <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ivory/90 text-night shadow-2xl transition duration-300 group-hover:scale-110 group-active:scale-95">
        <Play className="ml-1 h-7 w-7 fill-current" />
      </span>
      <span className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-night/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ivory backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-[#ff5a5a]" /> {label}
      </span>
    </button>
  );
}

function FilmControls({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="absolute bottom-4 left-4 grid h-11 w-11 place-items-center rounded-full bg-ivory/90 text-night shadow transition hover:scale-110 active:scale-95" aria-label={playing ? 'Pause' : 'Play'}>
      {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 translate-x-px fill-current" />}
    </button>
  );
}

function Lightbox({ open, onOpenChange, p, index, onIndex }: { open: boolean; onOpenChange: (v: boolean) => void; p: Product; index: number; onIndex: (n: number) => void }) {
  const { lang } = useT();
  const [k, setK] = useState(index);
  const startX = useRef<number | null>(null);
  useEffect(() => setK(index), [index, open]);
  const n = p.images.length;
  const step = useCallback((d: number) => setK((x) => (x + d + n) % n), [n]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step]);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onIndex(k); onOpenChange(v); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-night/95 data-[state=closed]:animate-[fadeOut_.25s_ease_forwards] data-[state=open]:animate-fade" />
        <Dialog.Content
          className="fixed inset-0 z-[91] flex flex-col outline-none data-[state=closed]:animate-[scaleOut_.22s_ease_forwards] data-[state=open]:animate-scale-in"
          onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (startX.current === null) return;
            const dx = e.changedTouches[0].clientX - startX.current;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
            startX.current = null;
          }}
        >
          <Dialog.Title className="sr-only">{tr(p.name, lang)}</Dialog.Title>
          <Dialog.Description className="sr-only">Image {k + 1} of {n}</Dialog.Description>
          <div className="flex items-center justify-between p-4 text-ivory">
            <span className="text-sm tabular-nums opacity-80">{k + 1} / {n}</span>
            <Dialog.Close className="grid h-11 w-11 place-items-center rounded-full bg-ivory/10 transition hover:bg-ivory/20" aria-label="Close"><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <div className="relative flex-1">
            <Image key={k} src={p.images[k].url} alt={tr(p.images[k].alt, lang) || tr(p.name, lang)} fill sizes="100vw" quality={85} className="animate-fade object-contain" />
            <button onClick={() => step(-1)} className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-ivory/10 text-ivory transition hover:bg-ivory/25" aria-label="Previous"><ChevronLeft className="h-6 w-6" /></button>
            <button onClick={() => step(1)} className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-ivory/10 text-ivory transition hover:bg-ivory/25" aria-label="Next"><ChevronRight className="h-6 w-6" /></button>
          </div>
          <div className="flex justify-center gap-2 p-4">
            {p.images.map((im, j) => (
              <button key={j} onClick={() => setK(j)} className={cn('relative h-16 w-12 overflow-hidden rounded-lg transition', j === k ? 'ring-2 ring-gold' : 'opacity-50 hover:opacity-90')} aria-label={`Image ${j + 1}`}>
                <Image src={im.url} alt="" fill sizes="48px" quality={60} className="object-cover" />
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
