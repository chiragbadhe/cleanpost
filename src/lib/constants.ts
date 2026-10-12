export const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB

export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export const SUPPORTED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.mp4',
  '.mov',
  '.webm',
] as const;
