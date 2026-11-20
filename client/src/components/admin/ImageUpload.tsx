'use client';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, UploadCloud, X } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/format';
import { toast } from '../ui/Toast';
import { useL } from './lib';

type Kind = 'products' | 'categories' | 'banners' | 'lookbook';
type MediaConfig = { enabled: boolean; cloudName: string; maxBytes: number; formats: string[] };
type Signed = { uploadUrl: string; apiKey: string; allowed_formats: string; folder: string; format: string; timestamp: number; signature: string };
type Job = { id: string; name: string; preview: string; progress: number; error?: string };

/** Fetched once per page load and shared by every uploader on the page. */
let configPromise: Promise<MediaConfig | null> | null = null;
const loadConfig = () => (configPromise ??= apiFetch<MediaConfig>('/admin/media/config', { admin: true }).catch(() => null));

/** Images only (no video). Everything is converted to WebP before upload and stored as WebP on Cloudinary. */
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_INPUT = 25 * 1024 * 1024; // raw photo straight from a phone
const MAX_EDGE = 2000; // px — plenty for zoom on a 4K screen

/* ───────────── Ruposhi watermark (drawn on the photo before upload) ───────────── */

const PETAL_BIG = 'M0 -6 C 7 -14 7 -30 0 -40 C -7 -30 -7 -14 0 -6 Z';
const PETAL_SMALL = 'M0 -9 C 5 -15 5 -25 0 -31 C -5 -25 -5 -15 0 -9 Z';

/** The site's display serif (Cormorant), so the watermark matches the logo exactly. */
async function displayFont() {
  const probe = document.createElement('span');
  probe.className = 'font-display';
  probe.style.cssText = 'position:absolute;visibility:hidden';
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily || 'Georgia, serif';
  probe.remove();
  try {
    await document.fonts.load(`600 64px ${family}`, 'RUPOSHI');
  } catch {
    /* fall back to whatever is available */
  }
  return family;
}

/**
 * The part of a photo that stays visible everywhere it is shown: product cards crop to 3:4 and the product
 * page to 4:5 (object-cover, centred). A square, landscape or 9:16 photo loses its sides or top/bottom there,
 * so the watermark is placed inside this rectangle, never in a part that gets cut away.
 */
const safeArea = (w: number, h: number) => {
  let sw = w;
  let sh = h;
  for (const a of [3 / 4, 4 / 5]) {
    if (w / h > a) sw = Math.min(sw, h * a);
    else sh = Math.min(sh, w / a);
  }
  return { sx: (w - sw) / 2, sy: (h - sh) / 2, sw, sh };
};

/**
 * Lotus mark + letter-spaced "RUPOSHI" in the bottom-right corner of the always-visible area, ~24% of its width.
 * Picks dark (espresso) or light (ivory) ink from the brightness behind it so it is always readable.
 */
async function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const family = await displayFont();
  const { sx, sy, sw, sh } = safeArea(w, h);
  const markW = Math.max(160, Math.round(sw * 0.24));
  const icon = markW * 0.2; // lotus size
  const gap = icon * 0.32;
  let fontPx = icon * 0.62;
  ctx.font = `600 ${fontPx}px ${family}`;
  const letters = 'RUPOSHI'.split('');
  const spacing = () => fontPx * 0.32;
  const textW = () => letters.reduce((s, ch) => s + ctx.measureText(ch).width, 0) + spacing() * (letters.length - 1);
  // fit text into the space left of the lotus
  const room = markW - icon - gap;
  fontPx *= Math.min(1.25, room / textW());
  ctx.font = `600 ${fontPx}px ${family}`;
  const totalW = icon + gap + textW();
  const marginX = Math.round(sw * 0.045);
  const marginY = Math.round(sh * 0.05);
  const x0 = sx + sw - marginX - totalW;
  const cy = sy + sh - marginY - icon / 2;

  // brightness behind the mark → choose ink
  let light = true;
  try {
    const d = ctx.getImageData(Math.max(0, Math.round(x0)), Math.max(0, Math.round(cy - icon / 2)), Math.round(totalW), Math.round(icon)).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 16) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    light = sum / (d.length / 16) > 150;
  } catch {
    /* keep default */
  }
  const ink = light ? '#2C1810' : '#FFF9F5';
  const gold = light ? '#8A5F38' : '#C9A07A';

  ctx.save();
  ctx.globalAlpha = 0.82;
  if (!light) {
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = Math.round(icon * 0.12);
  }
  // lotus (the 8-petal mark from the logo; path units are -40..40)
  ctx.save();
  ctx.translate(x0 + icon / 2, cy);
  ctx.scale(icon / 88, icon / 88);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'round';
  [0, 90, 180, 270].forEach((r) => { ctx.save(); ctx.rotate((r * Math.PI) / 180); ctx.stroke(new Path2D(PETAL_BIG)); ctx.restore(); });
  [45, 135, 225, 315].forEach((r) => { ctx.save(); ctx.rotate((r * Math.PI) / 180); ctx.stroke(new Path2D(PETAL_SMALL)); ctx.restore(); });
  ctx.beginPath();
  ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // wordmark
  ctx.fillStyle = ink;
  ctx.textBaseline = 'middle';
  let x = x0 + icon + gap;
  for (const ch of letters) {
    ctx.fillText(ch, x, cy + fontPx * 0.04);
    x += ctx.measureText(ch).width + spacing();
  }
  ctx.restore();
}

/**
 * Converts every photo to WebP in the browser before upload: max 2000px on the long edge, quality ~86%.
 * A 6–10 MB camera photo usually becomes 300–600 KB. If the browser can't encode WebP, the original is sent
 * and Cloudinary still stores it as WebP (format=webp is part of the signed upload).
 */
async function compress(file: File, watermark: boolean): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    if (watermark) await drawWatermark(ctx, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.86));
    if (blob?.type !== 'image/webp') throw new Error('webp');
    return blob;
  } catch {
    // could not decode/encode here (very old browser) → original goes up; Cloudinary still stores WebP, but without the watermark
    if (watermark) toast.info('Watermark could not be added in this browser — try Chrome or Edge.');
    return file;
  }
}

/** Signed direct upload to Cloudinary with progress. Resolves to the HTTPS URL of the stored image. */
function send(blob: Blob, name: string, s: Signed, onProgress: (p: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', blob, name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : ''));
    fd.append('format', s.format);
    fd.append('api_key', s.apiKey);
    fd.append('timestamp', String(s.timestamp));
    fd.append('signature', s.signature);
    fd.append('folder', s.folder);
    fd.append('allowed_formats', s.allowed_formats);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', s.uploadUrl);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let json: { secure_url?: string; error?: { message?: string } } = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && json.secure_url) resolve(json.secure_url);
      else reject(new Error(json.error?.message ?? `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error — check your connection.'));
    xhr.send(fd);
  });
}

/**
 * Drag & drop / tap-to-choose image uploader for the admin.
 * Hidden entirely until Cloudinary keys are in server/.env (pasting an image URL keeps working).
 */
export function ImageUpload({ kind, onUploaded, multiple = false, max = 12, compact = false }: { kind: Kind; onUploaded: (urls: string[]) => void; multiple?: boolean; max?: number; compact?: boolean }) {
  const L = useL();
  const [cfg, setCfg] = useState<MediaConfig | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [over, setOver] = useState(false);
  const [mark, setMark] = useState(true);
  useEffect(() => {
    try {
      setMark(localStorage.getItem('rp_watermark') !== 'off');
    } catch {
      /* storage blocked */
    }
  }, []);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ignore = false;
    loadConfig().then((c) => !ignore && setCfg(c));
    return () => {
      ignore = true;
    };
  }, []);

  if (!cfg?.enabled) return null;
  const busy = jobs.some((j) => !j.error && j.progress < 100);
  const patch = (id: string, p: Partial<Job>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...p } : j)));

  const start = async (files: File[]) => {
    const list = files.filter((f) => {
      if (!ACCEPT.includes(f.type)) return toast.error(L(`${f.name}: images only (JPG, PNG or WebP) — add videos as a YouTube link`, `${f.name}: শুধু ছবি (JPG, PNG বা WebP) — ভিডিও YouTube লিংক হিসেবে দিন`)), false;
      if (f.size > MAX_INPUT) return toast.error(L(`${f.name} is larger than 25 MB`, `${f.name} ২৫ MB-এর বেশি`)), false;
      return true;
    }).slice(0, multiple ? Math.max(0, max) : 1);
    if (!list.length) return;
    if (multiple && files.length > max) toast.info(L(`Only ${max} more image(s) allowed`, `আর ${max}টা ছবি দেওয়া যাবে`));

    const created: Job[] = list.map((f) => ({ id: crypto.randomUUID(), name: f.name, preview: URL.createObjectURL(f), progress: 0 }));
    setJobs((js) => [...js, ...created]);

    // in order, so the gallery keeps the order the files were picked in
    const urls: string[] = [];
    for (const [i, file] of list.entries()) {
      const job = created[i];
      try {
        const [blob, signed] = await Promise.all([compress(file, mark), apiFetch<Signed>('/admin/media/sign', { admin: true, body: { kind } })]);
        if (blob.size > cfg.maxBytes) throw new Error(L('Still larger than 10 MB after compression', 'ছোট করার পরও ১০ MB-এর বেশি'));
        urls.push(await send(blob, file.name, signed, (p) => patch(job.id, { progress: Math.min(p, 99) })));
        patch(job.id, { progress: 100 });
      } catch (e) {
        const msg = e instanceof ApiError || e instanceof Error ? e.message : String(e);
        patch(job.id, { error: msg });
        toast.error(`${file.name}: ${msg}`);
      }
    }
    if (urls.length) {
      onUploaded(urls);
      toast.success(L(`${urls.length} image(s) uploaded`, `${urls.length}টি ছবি আপলোড হয়েছে`));
    }
    // clear finished tiles after a moment; keep failed ones so the message stays visible
    setTimeout(() => {
      setJobs((js) => js.filter((j) => {
        const done = created.some((c) => c.id === j.id) && !j.error;
        if (done) URL.revokeObjectURL(j.preview);
        return !done;
      }));
    }, 900);
  };

  return (
    <div className={compact ? 'mt-2' : 'mt-3'}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          start(Array.from(e.dataTransfer.files));
        }}
        disabled={multiple && max <= 0}
        className={cn(
          'flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed text-sm transition-all duration-300 disabled:opacity-50',
          compact ? 'min-h-12 px-4' : 'min-h-28 flex-col px-6 py-5',
          over ? 'scale-[1.01] border-bronze bg-gold/10' : 'border-line hover:border-bronze/60 hover:bg-sand/60',
        )}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin text-bronze" /> : compact ? <ImagePlus className="h-5 w-5 text-bronze" /> : <UploadCloud className={cn('h-7 w-7 text-bronze transition-transform duration-300', over && '-translate-y-1')} />}
        <span className="text-center">
          <span className="font-semibold">{compact ? L('Upload image', 'ছবি আপলোড') : multiple ? L('Drop images here or tap to choose', 'ছবি এখানে টেনে আনুন বা ট্যাপ করে বাছুন') : L('Drop an image or tap to choose', 'ছবি টেনে আনুন বা ট্যাপ করে বাছুন')}</span>
          {!compact && <span className="mt-1 block text-xs text-mocha">{L('JPG · PNG · WebP → saved as WebP, resized automatically', 'JPG · PNG · WebP → WebP হিসেবে সেভ হবে, নিজে থেকে ছোট হবে')}</span>}
        </span>
      </button>
      <label className="mt-2 inline-flex cursor-pointer select-none items-center gap-2 text-xs text-mocha">
        <input
          type="checkbox"
          checked={mark}
          onChange={(e) => {
            setMark(e.target.checked);
            try {
              localStorage.setItem('rp_watermark', e.target.checked ? 'on' : 'off');
            } catch {
              /* storage blocked */
            }
          }}
          className="h-3.5 w-3.5 accent-[var(--color-espresso)]"
        />
        {L('Add the RUPOSHI watermark (bottom-right)', 'RUPOSHI ওয়াটারমার্ক বসাও (নিচে ডান কোণে)')}
      </label>
      <input
        ref={input}
        type="file"
        accept={ACCEPT.join(',')}
        multiple={multiple}
        hidden
        onChange={(e) => {
          start(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      {jobs.length > 0 && (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {jobs.map((j) => (
            <li key={j.id} className="relative animate-scale-in overflow-hidden rounded-xl border border-line" title={j.error ?? j.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={j.preview} alt="" className={cn('aspect-square w-full object-cover transition', j.progress < 100 && !j.error && 'opacity-60 blur-[1px]', j.error && 'opacity-40 grayscale')} />
              {j.error ? (
                <button type="button" onClick={() => setJobs((js) => js.filter((x) => x.id !== j.id))} className="absolute inset-0 grid place-items-center bg-danger/20 text-danger" aria-label="Dismiss">
                  <X className="h-5 w-5" />
                </button>
              ) : (
                <span className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-ivory/60">
                  <span className="block h-full rounded-full bg-bronze transition-[width] duration-300" style={{ width: `${j.progress}%` }} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
