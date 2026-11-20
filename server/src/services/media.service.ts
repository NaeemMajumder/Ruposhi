import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { badRequest } from '../lib/errors.js';

/**
 * Cloudinary SIGNED direct uploads.
 * The browser sends the file straight to Cloudinary (fast, no file passes through our API),
 * but only with a short-lived signature that this server issues to signed-in staff.
 * The API secret never leaves the server.
 */
/** Images only — there is deliberately no video upload (product videos are YouTube links). */
export const MEDIA_KINDS = ['products', 'categories', 'banners', 'lookbook'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** Inputs Cloudinary will accept; every image is STORED as WebP (format=webp is part of the signature). */
const ALLOWED_FORMATS = 'jpg,jpeg,png,webp';
const STORED_FORMAT = 'webp';

/** Cloudinary signature: sha1 of the alphabetically sorted params (`k=v&k=v`) followed by the API secret. */
export const cloudinarySignature = (params: Record<string, string | number>, secret: string) => {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + secret).digest('hex');
};

export const mediaConfig = () => ({
  enabled: config.cloudinary.enabled,
  cloudName: config.cloudinary.enabled ? config.cloudinary.cloudName : '',
  maxBytes: 10 * 1024 * 1024,
  formats: ALLOWED_FORMATS.split(','),
});

export const signUpload = (kind: MediaKind) => {
  const c = config.cloudinary;
  if (!c.enabled) throw badRequest('Image upload is not set up yet. Add the CLOUDINARY_* values to server/.env.');
  const params = {
    allowed_formats: ALLOWED_FORMATS,
    folder: `${c.folder}/${kind}`,
    format: STORED_FORMAT,
    timestamp: Math.floor(Date.now() / 1000), // Cloudinary rejects signatures older than 1 hour
  };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${c.cloudName}/image/upload`,
    apiKey: c.apiKey,
    ...params,
    signature: cloudinarySignature(params, c.apiSecret),
  };
};
