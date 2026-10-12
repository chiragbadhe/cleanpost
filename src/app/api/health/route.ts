import { NextResponse } from 'next/server';
import { exiftool } from 'exiftool-vendored';
import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function GET() {
  let exiftoolReady = false;
  let ffmpegReady = false;
  let sharpReady = false;
  let exiftoolVersion = 'unknown';
  let ffmpegVersion = 'unknown';

  try {
    const v = await exiftool.version();
    exiftoolReady = true;
    exiftoolVersion = String(v);
  } catch (e) {
    console.warn('Exiftool health check failed:', e);
  }

  try {
    const { stdout } = await execFileAsync('ffmpeg', ['-version']);
    ffmpegReady = true;
    ffmpegVersion = stdout.split('\n')[0] || 'ready';
  } catch (e) {
    console.warn('FFmpeg health check failed:', e);
  }

  try {
    if (sharp.format) {
      sharpReady = true;
    }
  } catch (e) {
    console.warn('Sharp health check failed:', e);
  }

  return NextResponse.json({
    status: 'ok',
    service: 'CleanPost Metadata Sanitization Engine',
    timestamp: new Date().toISOString(),
    engines: {
      sharp: { ready: sharpReady },
      exiftool: { ready: exiftoolReady, version: exiftoolVersion },
      ffmpeg: { ready: ffmpegReady, version: ffmpegVersion },
    },
    privacyGuarantees: {
      zeroDataRetention: true,
      noAiTraining: true,
      ephemeralProcessing: true,
    },
  });
}
