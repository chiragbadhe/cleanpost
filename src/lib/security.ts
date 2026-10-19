import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { MAX_FILE_SIZE_BYTES, SUPPORTED_MIME_TYPES, type SupportedMimeType } from './constants';
export { MAX_FILE_SIZE_BYTES, SUPPORTED_MIME_TYPES, type SupportedMimeType };

export interface FileValidationResult {
  valid: boolean;
  mimeType: string;
  extension: string;
  isVideo: boolean;
  isImage: boolean;
  error?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidFileId(id: unknown): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * Strips internal server paths, stack traces, and local filesystem details from error messages.
 */
export function sanitizeErrorMessage(err: unknown, defaultMessage = 'Processing failed'): string {
  if (!err) return defaultMessage;
  const rawMsg = err instanceof Error ? err.message : String(err);
  if (!rawMsg || rawMsg.trim().length === 0) return defaultMessage;

  // Strip unix/macOS/Windows file system paths
  const cleanMsg = rawMsg
    .replace(/(?:\/[a-zA-Z0-9._-]+){2,}/g, '[path]')
    .replace(/[a-zA-Z]:\\[a-zA-Z0-9._\\-]+/g, '[path]')
    .replace(/\bat\s+[^\n]+/g, '')
    .trim();

  // If the message contains internal ffmpeg/system errors, give clear user-facing description
  if (cleanMsg.includes('Invalid data found when processing input')) {
    return 'Corrupted or unsupported media input file.';
  }
  if (cleanMsg.includes('Conversion failed') || cleanMsg.includes('Error writing')) {
    return 'Media encoding failed due to incompatible stream parameters.';
  }
  if (cleanMsg.includes('Input file is missing') || cleanMsg.includes('ENOENT')) {
    return 'Input file could not be accessed.';
  }

  return cleanMsg.length > 200 ? `${cleanMsg.slice(0, 197)}...` : cleanMsg;
}

/**
 * Validates actual file magic byte signatures.
 * Rejects mismatched or disguised extensions (e.g. text or binary executable disguised as .jpg).
 */
export function detectFileType(buffer: Buffer, originalFilename: string): FileValidationResult {
  if (!buffer || buffer.length < 12) {
    return {
      valid: false,
      mimeType: 'application/octet-stream',
      extension: '',
      isVideo: false,
      isImage: false,
      error: 'File is too small or empty to verify media signature.',
    };
  }

  // 1. JPEG (0xFF 0xD8 0xFF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      valid: true,
      mimeType: 'image/jpeg',
      extension: '.jpg',
      isVideo: false,
      isImage: true,
    };
  }

  // 2. PNG (0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      valid: true,
      mimeType: 'image/png',
      extension: '.png',
      isVideo: false,
      isImage: true,
    };
  }

  // 3. WebP (RIFF .... WEBP)
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return {
      valid: true,
      mimeType: 'image/webp',
      extension: '.webp',
      isVideo: false,
      isImage: true,
    };
  }

  // 4. MP4 / MOV / HEIC (ftyp container)
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12).toLowerCase();
    if (['heic', 'mif1', 'msf1', 'heix', 'hevc'].includes(brand)) {
      return {
        valid: true,
        mimeType: 'image/heic',
        extension: '.heic',
        isVideo: false,
        isImage: true,
      };
    }
    if (brand === 'qt  ' || originalFilename.toLowerCase().endsWith('.mov')) {
      return {
        valid: true,
        mimeType: 'video/quicktime',
        extension: '.mov',
        isVideo: true,
        isImage: false,
      };
    }
    return {
      valid: true,
      mimeType: 'video/mp4',
      extension: '.mp4',
      isVideo: true,
      isImage: false,
    };
  }

  // 5. WebM (EBML: 0x1A 0x45 0xDF 0xA3)
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return {
      valid: true,
      mimeType: 'video/webm',
      extension: '.webm',
      isVideo: true,
      isImage: false,
    };
  }

  // Strictly reject files whose actual bytes do NOT match any supported media signature
  return {
    valid: false,
    mimeType: 'application/octet-stream',
    extension: '',
    isVideo: false,
    isImage: false,
    error: `Invalid file signature: ${originalFilename} is not a valid JPEG, PNG, WebP, HEIC, MP4, MOV, or WebM file.`,
  };
}

export function sanitizeFilename(filename: string, prefix = 'clean_'): string {
  // Strip null bytes and control chars
  const noControl = filename.replace(/[\0\x00-\x1f\x7f]/g, '');
  // Eliminate directory traversal sequences (both ../ and ..\)
  const noTraversal = noControl.replace(/(?:\.\.[\\/]+)+/g, '');
  // Flatten directory separators and drive delimiters to underscores
  const flattened = noTraversal.replace(/[\\/:]+/g, '_');
  // Strip any remaining dangerous characters
  const cleanBase = flattened.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^_+/, '').trim();
  const safeName = cleanBase.length > 0 ? cleanBase : 'file';

  // Prevent multiple consecutive dots
  const sanitized = safeName.replace(/\.{2,}/g, '.');

  if (prefix && sanitized.startsWith(prefix)) {
    return sanitized;
  }
  return `${prefix}${sanitized}`;
}

export async function createTempDir(): Promise<string> {
  const baseTemp = path.join(os.tmpdir(), 'cleanpost');
  await fs.mkdir(baseTemp, { recursive: true });
  const uniqueId = crypto.randomUUID();
  const tempDir = path.join(baseTemp, uniqueId);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    if (dirPath && dirPath.includes('cleanpost')) {
      await fs.rm(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Failed to clean up temp dir:', err);
  }
}

// In-memory download store for ephemeral cleaned files (purged automatically)
interface StoredCleanedFile {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  createdAt: number;
}

const fileStore = new Map<string, StoredCleanedFile>();
const STORE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

// Cleanup stale files periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [id, item] of fileStore.entries()) {
      if (now - item.createdAt > STORE_TTL_MS) {
        fileStore.delete(id);
      }
    }
  }, 60000);
}

export function saveCleanedFileEphemeral(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): { id: string; expiresAt: Date } {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + STORE_TTL_MS);
  fileStore.set(id, {
    buffer,
    fileName,
    mimeType,
    createdAt: Date.now(),
  });
  return { id, expiresAt };
}

export function getCleanedFileEphemeral(id: string): StoredCleanedFile | null {
  if (!isValidFileId(id)) return null;

  const item = fileStore.get(id);
  if (!item) return null;
  if (Date.now() - item.createdAt > STORE_TTL_MS) {
    fileStore.delete(id);
    return null;
  }
  return item;
}

export function removeCleanedFileEphemeral(id: string): void {
  if (isValidFileId(id)) {
    fileStore.delete(id);
  }
}
