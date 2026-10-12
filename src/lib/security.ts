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

export function detectFileType(buffer: Buffer, originalFilename: string): FileValidationResult {
  if (buffer.length < 12) {
    return {
      valid: false,
      mimeType: 'application/octet-stream',
      extension: '',
      isVideo: false,
      isImage: false,
      error: 'File is too small or corrupted to inspect format signature.',
    };
  }

  // 1. JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      valid: true,
      mimeType: 'image/jpeg',
      extension: '.jpg',
      isVideo: false,
      isImage: true,
    };
  }

  // 2. PNG
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

  // 3. WebP
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

  // Fallback check based on extension if header signature is non-standard
  const ext = path.extname(originalFilename).toLowerCase();
  if (['.jpg', '.jpeg'].includes(ext)) {
    return { valid: true, mimeType: 'image/jpeg', extension: '.jpg', isVideo: false, isImage: true };
  }
  if (ext === '.png') {
    return { valid: true, mimeType: 'image/png', extension: '.png', isVideo: false, isImage: true };
  }
  if (ext === '.webp') {
    return { valid: true, mimeType: 'image/webp', extension: '.webp', isVideo: false, isImage: true };
  }
  if (['.heic', '.heif'].includes(ext)) {
    return { valid: true, mimeType: 'image/heic', extension: '.heic', isVideo: false, isImage: true };
  }
  if (ext === '.mp4') {
    return { valid: true, mimeType: 'video/mp4', extension: '.mp4', isVideo: true, isImage: false };
  }
  if (ext === '.mov') {
    return { valid: true, mimeType: 'video/quicktime', extension: '.mov', isVideo: true, isImage: false };
  }
  if (ext === '.webm') {
    return { valid: true, mimeType: 'video/webm', extension: '.webm', isVideo: true, isImage: false };
  }

  return {
    valid: false,
    mimeType: 'application/octet-stream',
    extension: '',
    isVideo: false,
    isImage: false,
    error: `Unsupported file format: ${originalFilename}. Supported formats: JPG, PNG, WebP, HEIC, MP4, MOV, WebM.`,
  };
}

export function sanitizeFilename(filename: string, prefix = 'clean_'): string {
  // Strip paths, null bytes, and malicious characters
  const base = path.basename(filename).replace(/[\0\x00-\x1f\x7f\\/?<>:*|":]/g, '');
  const cleanBase = base.replace(/[^a-zA-Z0-9._-]/g, '_').trim();
  const safeName = cleanBase.length > 0 ? cleanBase : 'file';
  
  if (safeName.startsWith(prefix)) {
    return safeName;
  }
  return `${prefix}${safeName}`;
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
    console.error('Failed to clean up temp dir:', dirPath, err);
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
  const item = fileStore.get(id);
  if (!item) return null;
  if (Date.now() - item.createdAt > STORE_TTL_MS) {
    fileStore.delete(id);
    return null;
  }
  return item;
}

export function removeCleanedFileEphemeral(id: string): void {
  fileStore.delete(id);
}
