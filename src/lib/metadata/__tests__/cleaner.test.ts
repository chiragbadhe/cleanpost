import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { exiftool } from 'exiftool-vendored';
import { cleanImage } from '../cleaner';

describe('CleanPost Media Cleaner Engine', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `cleanpost_cleaner_test_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('preserves readability, dimensions, and matching MIME types for JPEG, PNG, and WebP', async () => {
    const formats: Array<{ ext: string; mime: string; sharpFmt: 'jpeg' | 'png' | 'webp' }> = [
      { ext: '.jpg', mime: 'image/jpeg', sharpFmt: 'jpeg' },
      { ext: '.png', mime: 'image/png', sharpFmt: 'png' },
      { ext: '.webp', mime: 'image/webp', sharpFmt: 'webp' },
    ];

    for (const fmt of formats) {
      const inputPath = path.join(tempDir, `test_in${fmt.ext}`);
      const outputPath = path.join(tempDir, `test_out${fmt.ext}`);

      await sharp({
        create: { width: 80, height: 60, channels: 3, background: { r: 100, g: 150, b: 200 } },
      })
        [fmt.sharpFmt]()
        .toFile(inputPath);

      const res = await cleanImage(
        inputPath,
        outputPath,
        {
          removeExif: true,
          removeGps: true,
          removeTimestamps: true,
          removeSoftware: true,
          removeXmpIptc: true,
          removeThumbnails: true,
          stripC2pa: true,
          stripAiPrompts: true,
          reencode: true,
          targetFormat: 'original',
          quality: 90,
        },
        { mimeType: fmt.mime, extension: fmt.ext }
      );

      // Verify returned MIME type and extension agree
      expect(res.finalMimeType).toBe(fmt.mime);
      expect(res.finalExtension).toBe(fmt.ext);

      // Verify file readability and dimensions
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(80);
      expect(metadata.height).toBe(60);
      expect(metadata.format).toBe(fmt.sharpFmt);
    }
  });

  it('preserves image orientation when removing EXIF metadata (Coverage: Requirement 7.5)', async () => {
    const orientInput = path.join(tempDir, 'orient_in.jpg');
    const orientOutput = path.join(tempDir, 'orient_out.jpg');

    // Create 100x50 image with EXIF orientation 6 (90 degrees rotate)
    await sharp({
      create: { width: 100, height: 50, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .jpeg()
      .toFile(orientInput);

    await exiftool.write(orientInput, { Orientation: 6 }, ['-n', '-overwrite_original']);

    await cleanImage(
      orientInput,
      orientOutput,
      {
        removeExif: true,
        removeGps: true,
        removeTimestamps: true,
        removeSoftware: true,
        removeXmpIptc: true,
        removeThumbnails: true,
        stripC2pa: true,
        stripAiPrompts: true,
        reencode: true,
        targetFormat: 'original',
        quality: 90,
      },
      { mimeType: 'image/jpeg', extension: '.jpg' }
    );

    // After cleanImage, auto-rotate applied orientation 6, swapping width & height to upright
    const cleanedMeta = await sharp(orientOutput).metadata();
    expect(cleanedMeta.width).toBe(50);
    expect(cleanedMeta.height).toBe(100);
    expect(cleanedMeta.orientation).toBeUndefined(); // EXIF orientation tag stripped
  });

  it('cleans up temporary files upon failure', async () => {
    const brokenInput = path.join(tempDir, 'corrupted.jpg');
    const brokenOutput = path.join(tempDir, 'corrupted_out.jpg');

    // Write truncated corrupted data
    await fs.writeFile(brokenInput, Buffer.from([0xff, 0xd8, 0xff, 0x00]));

    await expect(
      cleanImage(
        brokenInput,
        brokenOutput,
        {
          removeExif: true,
          removeGps: true,
          removeTimestamps: true,
          removeSoftware: true,
          removeXmpIptc: true,
          removeThumbnails: true,
          stripC2pa: true,
          stripAiPrompts: true,
          reencode: true,
          targetFormat: 'original',
          quality: 90,
        },
        { mimeType: 'image/jpeg', extension: '.jpg' }
      )
    ).rejects.toThrow();

    // Verify partial output file was deleted
    const exists = await fs.stat(brokenOutput).then(() => true).catch(() => false);
    expect(exists).toBe(false);
  });
});
