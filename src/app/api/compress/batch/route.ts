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
  CompressedFileResult,
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

    const files = formData.getAll('files') as File[];
    const optionsRaw = formData.get('options') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded. Provide images in the "files" field.' },
        { status: 400 }
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

    tempDir = await createTempDir();
    const results: CompressedFileResult[] = [];
    const errors: { fileName: string; error: string }[] = [];

    // Process files sequentially to maintain predictable memory and CPU usage
    for (const file of files) {
      const fileName = file.name || 'unnamed_image';
      if (file.size === 0) {
        errors.push({
          fileName,
          error: 'File is empty (0 bytes).',
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push({
          fileName,
          error: `File exceeds size limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
        });
        continue;
      }

      try {
        const originalName = sanitizeFilename(fileName, '');
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const typeInfo = detectFileType(buffer.subarray(0, 4096), originalName);
        if (!typeInfo.valid) {
          errors.push({
            fileName,
            error: typeInfo.error || 'Invalid media file format signature.',
          });
          continue;
        }

        if (!typeInfo.isImage) {
          errors.push({
            fileName,
            error: `Unsupported file type (${typeInfo.mimeType}). Only images are supported.`,
          });
          continue;
        }

        const tempInputPath = path.join(tempDir, `in_${Date.now()}_${originalName}`);
        await fs.writeFile(tempInputPath, buffer);

        const res = await processImageCompression({
          inputFilePath: tempInputPath,
          originalFileName: originalName,
          options: parsedOptions,
          outputDir: tempDir,
        });

        results.push(res);
      } catch (err: unknown) {
        console.error(`Error processing compression batch for ${fileName}:`, err);
        errors.push({
          fileName,
          error: sanitizeErrorMessage(err, 'Compression failed'),
        });
      }
    }

    return NextResponse.json({
      totalProcessed: files.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error: unknown) {
    console.error('Batch compression route error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Batch compression failure.') },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
