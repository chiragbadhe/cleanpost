import { describe, it, expect } from 'vitest';
import {
  detectFileType,
  sanitizeFilename,
  isValidFileId,
  sanitizeErrorMessage,
  saveCleanedFileEphemeral,
  getCleanedFileEphemeral,
} from '../security';

describe('CleanPost Security & Validation Engine', () => {
  it('detects valid JPEG magic signature (0xFF 0xD8 0xFF)', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const res = detectFileType(buffer, 'photo.jpg');
    expect(res.valid).toBe(true);
    expect(res.mimeType).toBe('image/jpeg');
    expect(res.extension).toBe('.jpg');
    expect(res.isImage).toBe(true);
  });

  it('detects valid PNG magic signature (0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A)', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const res = detectFileType(buffer, 'graphic.png');
    expect(res.valid).toBe(true);
    expect(res.mimeType).toBe('image/png');
    expect(res.extension).toBe('.png');
  });

  it('detects valid WebP signature (RIFF .... WEBP)', () => {
    const buffer = Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 ');
    const res = detectFileType(buffer, 'sticker.webp');
    expect(res.valid).toBe(true);
    expect(res.mimeType).toBe('image/webp');
    expect(res.extension).toBe('.webp');
  });

  it('rejects files with invalid signatures disguised as images (Coverage: Requirement 7.3)', () => {
    // Plain text disguised as a JPG file
    const fakeJpg = Buffer.from('Hello, I am a plain text file pretending to be an image!');
    const res = detectFileType(fakeJpg, 'malicious.jpg');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Invalid file signature');
  });

  it('rejects files that are too small to verify (<12 bytes)', () => {
    const tiny = Buffer.from([0xff, 0xd8, 0xff]);
    const res = detectFileType(tiny, 'tiny.jpg');
    expect(res.valid).toBe(false);
  });

  it('sanitizes filenames and eliminates path traversal attempts', () => {
    expect(sanitizeFilename('../../../etc/passwd.jpg', '')).toBe('etc_passwd.jpg');
    expect(sanitizeFilename('..\\..\\Windows\\System32\\cmd.exe', '')).toBe('Windows_System32_cmd.exe');
    expect(sanitizeFilename('my vacation photo (1).jpeg', 'clean_')).toBe('clean_my_vacation_photo__1_.jpeg');
  });

  it('strictly validates UUID file IDs', () => {
    expect(isValidFileId('12345678-1234-1234-1234-123456789abc')).toBe(true);
    expect(isValidFileId('../../malicious/path')).toBe(false);
    expect(isValidFileId('')).toBe(false);
    expect(isValidFileId(12345)).toBe(false);
    expect(isValidFileId('not-a-valid-uuid')).toBe(false);
  });

  it('sanitizes error messages without exposing server filesystem paths', () => {
    const rawError = new Error('Command failed: ffmpeg -i /var/folders/tp/bs9j2yv56xs0k0mlrpv2hxb00000gn/T/input.mp4: Invalid data');
    const clean = sanitizeErrorMessage(rawError);
    expect(clean).not.toContain('/var/folders');
    expect(clean).toContain('[path]');
  });

  it('saves and retrieves ephemeral cleaned files within TTL', () => {
    const buf = Buffer.from('Cleaned file content test');
    const { id, expiresAt } = saveCleanedFileEphemeral(buf, 'test.jpg', 'image/jpeg');
    expect(isValidFileId(id)).toBe(true);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const retrieved = getCleanedFileEphemeral(id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.fileName).toBe('test.jpg');
    expect(retrieved?.buffer.toString()).toBe('Cleaned file content test');
  });
});
