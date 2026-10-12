import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { exiftool } from 'exiftool-vendored';
import { inspectFileMetadata, scanBufferForAiAndC2pa } from '../inspector';
import { cleanImage } from '../cleaner';
import { detectFileType } from '../../security';

describe('CleanPost Metadata Inspector & Cleaner Engine', () => {
  let tempDir: string;
  let testImagePath: string;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `cleanpost_test_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    testImagePath = path.join(tempDir, 'sample_photo.jpg');

    // Create a 100x100 solid image with sharp
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 50, g: 120, b: 200 },
      },
    })
      .jpeg()
      .toFile(testImagePath);

    // Write EXIF, GPS, Software, and mock AI/C2PA tags into testImagePath using exiftool
    await exiftool.write(testImagePath, {
      Make: 'CleanPost Camera',
      Model: 'PrivacyTester 9000',
      Software: 'Adobe Photoshop 2026',
      GPSLatitude: 37.7749,
      GPSLongitude: -122.4194,
      GPSAltitude: 15,
      DateTimeOriginal: '2026:10:12 12:00:00',
      UserComment: 'Steps: 25, Sampler: Euler a, CFG scale: 7, Seed: 1337',
    });
  });

  afterAll(async () => {
    await exiftool.end();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('correctly detects file type and signature', async () => {
    const buffer = await fs.readFile(testImagePath);
    const detection = detectFileType(buffer, 'sample_photo.jpg');
    expect(detection.valid).toBe(true);
    expect(detection.mimeType).toBe('image/jpeg');
    expect(detection.isImage).toBe(true);
  });

  it('scans and identifies EXIF, GPS, Timestamps, Software, and AI prompt indicators', async () => {
    const metadata = await inspectFileMetadata(testImagePath, 'sample_photo.jpg');

    expect(metadata.hasGps).toBe(true);
    expect(metadata.categories.gps.latitude).toBeCloseTo(37.7749, 2);
    expect(metadata.categories.gps.longitude).toBeCloseTo(-122.4194, 2);
    expect(metadata.privacyRiskScore).toBe('critical');

    expect(metadata.categories.device.make).toBe('CleanPost Camera');
    expect(metadata.categories.device.model).toBe('PrivacyTester 9000');
    expect(metadata.categories.software.software).toContain('Photoshop');

    // AI indicators detection
    expect(metadata.hasAiIndicators).toBe(true);
    expect(metadata.categories.aiIndicators.confidence).toBe('confirmed');
  });

  it('cleans image, stripping all EXIF, GPS, software, and AI parameters', async () => {
    const cleanedPath = path.join(tempDir, 'sample_photo_clean.jpg');
    await cleanImage(
      testImagePath,
      cleanedPath,
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
        targetFormat: 'jpeg',
        quality: 90,
      },
      { mimeType: 'image/jpeg', extension: '.jpg' }
    );

    const afterMetadata = await inspectFileMetadata(cleanedPath, 'sample_photo_clean.jpg');

    expect(afterMetadata.hasGps).toBe(false);
    expect(afterMetadata.categories.gps.latitude).toBeUndefined();
    expect(afterMetadata.categories.device.make).toBeUndefined();
    expect(afterMetadata.categories.software.software).toBeUndefined();
    expect(afterMetadata.hasAiIndicators).toBe(false);
    expect(afterMetadata.privacyRiskScore).toBe('low');
  });

  it('scans buffers for C2PA and generative markers accurately', () => {
    const mockC2paBuffer = Buffer.from('Testing... c2pa.manifest with jumb superbox and trainedAlgorithmicMedia');
    const scan = scanBufferForAiAndC2pa(mockC2paBuffer);
    expect(scan.c2paDetected).toBe(true);
    expect(scan.aiDetected).toBe(true);
    expect(scan.digitalSourceType).toContain('trainedAlgorithmicMedia');
  });
});
