const SAFE_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

const SAFE_DATA_IMAGE_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const SAFE_RELATIVE_ASSET_RE = /^\/(?:src\/)?assets\/[A-Za-z0-9._/-]+$/;

export const MAX_IMAGE_UPLOAD_BYTES = 1.5 * 1024 * 1024;
export const SAFE_IMAGE_ACCEPT_ATTR = 'image/png,image/jpeg,image/webp,image/gif';

/**
 * Allows only explicit http: and https: URLs. Rejects javascript:, data:, vbscript:, file:, etc.
 */
export function sanitizeHttpUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidate =
    /^https?:\/\//i.test(trimmed) || trimmed.includes('://')
      ? trimmed
      : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Allows only safe raster image data URLs (blocking SVG/HTML XSS),
 * http/https image URLs, or known local /assets paths.
 */
export function sanitizeSafeImageUrl(
  raw?: string | null,
  allowRelativeAssets = false
): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (SAFE_DATA_IMAGE_RE.test(trimmed)) {
    return trimmed;
  }

  if (allowRelativeAssets && SAFE_RELATIVE_ASSET_RE.test(trimmed) && !trimmed.includes('..')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function validateSafeImageFile(file: File): { valid: true } | { valid: false; error: string } {
  const mime = (file.type || '').toLowerCase();
  if (!SAFE_IMAGE_MIME_TYPES.has(mime)) {
    return {
      valid: false,
      error: 'Unsupported image format. Please use PNG, JPEG, WebP, or GIF.',
    };
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return {
      valid: false,
      error: 'Image is too large. Please select a file under 1.5 MB.',
    };
  }
  return { valid: true };
}
