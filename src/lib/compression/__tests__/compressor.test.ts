import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { exiftool } from 'exiftool-vendored';
import { processImageCompression } from '../compressor';
import { getCleanedFileEphemeral } from '@/lib/security';

describe('CleanPost Image Compressor Engine', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `cleanpost_compression_test_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    await exiftool.end();
  });

  it('compresses JPEG with quality trade-off (lower quality produces smaller size)', async () => {
    const inputPath = path.join(tempDir, 'test_sample.jpg');
    // Create detailed 200x200 JPEG
    await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 120, g: 150, b: 200 },
      },
    })
      .jpeg({ quality: 100 })
      .toFile(inputPath);

    // High quality compression
    const highQResult = await processImageCompression({
      inputFilePath: inputPath,
      originalFileName: 'test_sample.jpg',
      options: {
        quality: 95,
        preset: 'high_quality',
        targetFormat: 'original',
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: true,
      },
      outputDir: tempDir,
    });

    // Low size compression
    const lowQResult = await processImageCompression({
      inputFilePath: inputPath,
      originalFileName: 'test_sample.jpg',
      options: {
        quality: 40,
        preset: 'low_size',
        targetFormat: 'original',
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: true,
      },
      outputDir: tempDir,
    });

    expect(highQResult.format).toBe('jpeg');
    expect(lowQResult.format).toBe('jpeg');
    expect(lowQResult.compressedSize).toBeLessThanOrEqual(highQResult.compressedSize);
    expect(lowQResult.compressedFileName).toBe('test_sample-compressed.jpg');
    expect(highQResult.compressedDimensions.width).toBe(200);
    expect(highQResult.compressedDimensions.height).toBe(200);
  });

  it('compresses to WebP format with format conversion', async () => {
    const inputPath = path.join(tempDir, 'photo.jpg');
    await sharp({
      create: { width: 150, height: 150, channels: 3, background: { r: 255, g: 100, b: 50 } },
    })
      .jpeg()
      .toFile(inputPath);

    const res = await processImageCompression({
      inputFilePath: inputPath,
      originalFileName: 'photo.jpg',
      options: {
        quality: 80,
        preset: 'balanced',
        targetFormat: 'webp',
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: true,
      },
      outputDir: tempDir,
    });

    expect(res.format).toBe('webp');
    expect(res.mimeType).toBe('image/webp');
    expect(res.compressedFileName).toBe('photo-compressed.webp');
    expect(res.appliedFormat).toBe('WEBP');
  });

  it('handles transparency correctly when converting PNG with alpha to JPEG', async () => {
    const inputPng = path.join(tempDir, 'transparent.png');
    // Create 100x100 transparent image (RGBA, alpha=0)
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toFile(inputPng);

    const res = await processImageCompression({
      inputFilePath: inputPng,
      originalFileName: 'transparent.png',
      options: {
        quality: 80,
        preset: 'balanced',
        targetFormat: 'jpeg',
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: true,
      },
      outputDir: tempDir,
    });

    expect(res.format).toBe('jpeg');
    expect(res.hasTransparency).toBe(true);
    expect(res.transparencyHandled).toContain('white background');

    // Verify resulting image has no alpha and can be read by Sharp
    const stored = getCleanedFileEphemeral(res.fileId);
    expect(stored).not.toBeNull();
    const meta = await sharp(stored!.buffer).metadata();
    expect(meta.hasAlpha).toBe(false);
    expect(meta.format).toBe('jpeg');
  });

  it('preserves transparency when compressing PNG to WebP', async () => {
    const inputPng = path.join(tempDir, 'transparent_logo.png');
    await sharp({
      create: {
        width: 80,
        height: 80,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toFile(inputPng);

    const res = await processImageCompression({
      inputFilePath: inputPng,
      originalFileName: 'transparent_logo.png',
      options: {
        quality: 80,
        preset: 'balanced',
        targetFormat: 'webp',
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: true,
      },
      outputDir: tempDir,
    });

    expect(res.format).toBe('webp');
    expect(res.hasTransparency).toBe(true);
    const stored = getCleanedFileEphemeral(res.fileId);
    const meta = await sharp(stored!.buffer).metadata();
    expect(meta.hasAlpha).toBe(true);
  });

  it('resizes images preserving aspect ratio without upscaling', async () => {
    const inputPath = path.join(tempDir, 'landscape.jpg');
    // 800x400 image (2:1 aspect ratio)
    await sharp({
      create: { width: 800, height: 400, channels: 3, background: { r: 40, g: 180, b: 80 } },
    })
      .jpeg()
      .toFile(inputPath);

    const res = await processImageCompression({
      inputFilePath: inputPath,
      originalFileName: 'landscape.jpg',
      options: {
        quality: 85,
        preset: 'balanced',
        targetFormat: 'original',
        maxWidth: 400,
        maxHeight: 400,
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: true,
      },
      outputDir: tempDir,
    });

    // 800x400 fitted inside 400x400 with preserved aspect ratio -> 400x200
    expect(res.compressedDimensions.width).toBe(400);
    expect(res.compressedDimensions.height).toBe(200);

    // Test withoutEnlargement: image smaller than maxWidth should not be upscaled
    const noUpscaleRes = await processImageCompression({
      inputFilePath: inputPath,
      originalFileName: 'landscape.jpg',
      options: {
        quality: 85,
        preset: 'balanced',
        targetFormat: 'original',
        maxWidth: 1600,
        maxHeight: 1600,
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: true,
      },
      outputDir: tempDir,
    });

    expect(noUpscaleRes.compressedDimensions.width).toBe(800);
    expect(noUpscaleRes.compressedDimensions.height).toBe(400);
  });

  it('handles EXIF orientation correctly during compression', async () => {
    const orientInput = path.join(tempDir, 'orient_compress.jpg');
    // 120x60 image with EXIF orientation 6 (90 deg rotate)
    await sharp({
      create: { width: 120, height: 60, channels: 3, background: { r: 200, g: 50, b: 50 } },
    })
      .jpeg()
      .toFile(orientInput);

    await exiftool.write(orientInput, { Orientation: 6 }, ['-n', '-overwrite_original']);

    const res = await processImageCompression({
      inputFilePath: orientInput,
      originalFileName: 'orient_compress.jpg',
      options: {
        quality: 80,
        preset: 'balanced',
        targetFormat: 'original',
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: true,
      },
      outputDir: tempDir,
    });

    // Auto-rotated upright: width and height swapped to 60x120
    expect(res.compressedDimensions.width).toBe(60);
    expect(res.compressedDimensions.height).toBe(120);
  });

  it('supports metadata stripping vs preservation', async () => {
    const metaInput = path.join(tempDir, 'with_meta.jpg');
    await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 100, g: 100, b: 100 } },
    })
      .jpeg()
      .toFile(metaInput);

    await exiftool.write(metaInput, { Artist: 'CleanPost Test Artist' }, ['-overwrite_original']);

    // 1. Strip metadata
    const strippedRes = await processImageCompression({
      inputFilePath: metaInput,
      originalFileName: 'with_meta.jpg',
      options: {
        quality: 80,
        preset: 'balanced',
        targetFormat: 'original',
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: true,
      },
      outputDir: tempDir,
    });

    expect(strippedRes.metadataStripped).toBe(true);
    const strippedStored = getCleanedFileEphemeral(strippedRes.fileId);
    const checkStrippedPath = path.join(tempDir, 'check_stripped.jpg');
    await fs.writeFile(checkStrippedPath, strippedStored!.buffer);
    const strippedTags = await exiftool.read(checkStrippedPath);
    expect(strippedTags.Artist).toBeUndefined();

    // 2. Preserve metadata
    const preservedRes = await processImageCompression({
      inputFilePath: metaInput,
      originalFileName: 'with_meta.jpg',
      options: {
        quality: 80,
        preset: 'balanced',
        targetFormat: 'original',
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: false,
      },
      outputDir: tempDir,
    });

    expect(preservedRes.metadataStripped).toBe(false);
    const preservedStored = getCleanedFileEphemeral(preservedRes.fileId);
    const checkPreservedPath = path.join(tempDir, 'check_preserved.jpg');
    await fs.writeFile(checkPreservedPath, preservedStored!.buffer);
    const preservedTags = await exiftool.read(checkPreservedPath);
    expect(preservedTags.Artist).toBe('CleanPost Test Artist');
  });

  it('attempts to meet target file size budget iteratively', async () => {
    const inputPath = path.join(tempDir, 'target_budget.jpg');
    // Create an image with noise so it has substantial uncompressed byte size
    await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
        noise: { type: 'gaussian', mean: 128, sigma: 40 },
      },
    })
      .jpeg({ quality: 95 })
      .toFile(inputPath);

    const originalStats = await fs.stat(inputPath);
    // Request a target size of 20 KB
    const targetBytes = 20 * 1024;

    const res = await processImageCompression({
      inputFilePath: inputPath,
      originalFileName: 'target_budget.jpg',
      options: {
        quality: 90,
        preset: 'custom',
        targetFormat: 'jpeg',
        targetSizeBytes: targetBytes,
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: true,
      },
      outputDir: tempDir,
    });

    expect(res.targetSizeRequested).toBe(targetBytes);
    expect(res.compressedSize).toBeLessThan(originalStats.size);
    if (res.targetSizeAchieved) {
      expect(res.compressedSize).toBeLessThanOrEqual(targetBytes);
    } else {
      expect(res.targetSizeNotice).toBeDefined();
    }
  });

  it('rejects unsupported and corrupted files with descriptive errors', async () => {
    const brokenPath = path.join(tempDir, 'invalid.jpg');
    await fs.writeFile(brokenPath, Buffer.from('this is not an image at all'));

    await expect(
      processImageCompression({
        inputFilePath: brokenPath,
        originalFileName: 'invalid.jpg',
        options: {
          quality: 80,
          preset: 'balanced',
          targetFormat: 'original',
          preserveAspectRatio: true,
          allowUpscaling: false,
          stripMetadata: true,
        },
        outputDir: tempDir,
      })
    ).rejects.toThrow();
  });
});
