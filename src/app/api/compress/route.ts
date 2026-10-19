import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  createTempDir,
  cleanupTempDir,
  detectFileType,
  MAX_FILE_SIZE_BYTES,
  sanitizeFilename,
  sanitizeErrorMessage,
} from '@/lib/security';
import {
  CompressionOptionsSchema,
  CompressionOptions,
} from '@/types/compression';
import { processImageCompression } from '@/lib/compression/compressor';

export async function POST(req: NextRequest) {
  let tempDir = '';

  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: 'Malformed multipart form data request.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const optionsRaw = formData.get('options') as string | null;

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'No image file uploaded. Please provide an image file in the "file" field.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'Uploaded file is empty (0 bytes).' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds the limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }

    let parsedOptions: CompressionOptions = {
      quality: 80,
      preset: 'balanced',
      targetFormat: 'original',
      preserveAspectRatio: true,
      allowUpscaling: false,
      stripMetadata: true,
    };

    if (optionsRaw) {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(optionsRaw);
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON payload in "options" field.' },
          { status: 400 }
        );
      }

      const validated = CompressionOptionsSchema.safeParse(parsedJson);
      if (!validated.success) {
        const issues = validated.error.issues
          .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
          .join('; ');
        return NextResponse.json(
          { error: `Invalid compression options: ${issues}` },
          { status: 400 }
        );
      }
      parsedOptions = validated.data;
    }

    const originalName = sanitizeFilename(file.name || 'uploaded_image', '');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate binary signature - must be an image
    const typeInfo = detectFileType(buffer.subarray(0, 4096), originalName);
    if (!typeInfo.valid) {
      return NextResponse.json(
        { error: typeInfo.error || 'Invalid media format signature.' },
        { status: 400 }
      );
    }

    if (!typeInfo.isImage) {
      return NextResponse.json(
        {
          error: `Unsupported file type (${typeInfo.mimeType}). Compression is only supported for image files (JPEG, PNG, WebP, HEIC).`,
        },
        { status: 400 }
      );
    }

    tempDir = await createTempDir();
    const tempInputPath = path.join(tempDir, originalName);
    await fs.writeFile(tempInputPath, buffer);

    const result = await processImageCompression({
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
    console.error('Image compression error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Image compression failed.') },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
