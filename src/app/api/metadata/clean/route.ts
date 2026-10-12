import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  createTempDir,
  cleanupTempDir,
  detectFileType,
  MAX_FILE_SIZE_BYTES,
  sanitizeFilename,
} from '@/lib/security';
import { CleaningOptionsSchema, CleaningOptions } from '@/types/metadata';
import { processFileCleaning } from '@/lib/metadata/cleaner';

export async function POST(req: NextRequest) {
  let tempDir = '';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const optionsRaw = formData.get('options') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded. Please provide a media file in the "file" field.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds the limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }

    let parsedOptions: CleaningOptions = {
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
    };

    if (optionsRaw) {
      try {
        const parsed = JSON.parse(optionsRaw);
        parsedOptions = CleaningOptionsSchema.parse(parsed);
      } catch (e) {
        console.warn('Options parsing fallback:', e);
      }
    }

    const originalName = sanitizeFilename(file.name || 'uploaded_file', '');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate signature
    const typeInfo = detectFileType(buffer.subarray(0, 4096), originalName);
    if (!typeInfo.valid) {
      return NextResponse.json(
        { error: typeInfo.error || 'Invalid or unsupported media format.' },
        { status: 400 }
      );
    }

    tempDir = await createTempDir();
    const tempInputPath = path.join(tempDir, originalName);
    await fs.writeFile(tempInputPath, buffer);

    const result = await processFileCleaning({
      inputFilePath: tempInputPath,
      originalFileName: originalName,
      options: parsedOptions,
      outputDir: tempDir,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: unknown) {
    console.error('Cleaning error:', error);
    return NextResponse.json(
      { error: (error as Error)?.message || 'Failed to clean file metadata.' },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
