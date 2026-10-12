import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { inspectFileMetadata } from '../inspector';
import { cleanVideo } from '../cleaner';

const execFileAsync = promisify(execFile);

describe('CleanPost Video Processing Integration Test', () => {
  let tempDir: string;
  let testVideoPath: string;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `cleanpost_video_test_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    testVideoPath = path.join(tempDir, 'sample_clip.mp4');

    // Generate a 1-second synthetic MP4 clip with ffmpeg containing metadata and title tags
    await execFileAsync('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', 'testsrc=duration=1:size=320x240:rate=24',
      '-f', 'lavfi',
      '-i', 'sine=frequency=1000:duration=1',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-metadata', 'title=Secret User Home Video',
      '-metadata', 'comment=Filmed on iPhone 16 Pro',
      '-metadata', 'artist=Privacy Test User',
      '-metadata', 'software=Final Cut Pro 11',
      testVideoPath,
    ]);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('detects video metadata and container properties', async () => {
    const metadata = await inspectFileMetadata(testVideoPath, 'sample_clip.mp4');
    expect(metadata.format).toBe('MP4');
    expect(metadata.dimensions?.width).toBe(320);
    expect(metadata.dimensions?.height).toBe(240);
  });

  it('strips video metadata atoms cleanly using ffmpeg', async () => {
    const cleanedPath = path.join(tempDir, 'sample_clip_clean.mp4');
    await cleanVideo(
      testVideoPath,
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
        reencode: false,
        targetFormat: 'original',
        quality: 90,
      },
      { mimeType: 'video/mp4', extension: '.mp4' }
    );

    const afterMetadata = await inspectFileMetadata(cleanedPath, 'sample_clip_clean.mp4');
    // Ensure metadata tags like title/comment/software/artist are removed
    const tags = afterMetadata.rawTags as Record<string, unknown>;
    expect(tags.Title).toBeUndefined();
    expect(tags.Artist).toBeUndefined();
    expect(tags.Comment).toBeUndefined();
  });
});
