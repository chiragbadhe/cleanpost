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
  CleaningOptionsSchema,
  CleaningOptions,
  CleanedFileResult,
} from '@/types/metadata';
import { processFileCleaning } from '@/lib/metadata/cleaner';

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
        { error: 'No files uploaded. Provide files in the "files" field.' },
        { status: 400 }
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
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(optionsRaw);
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON payload in "options" field.' },
          { status: 400 }
        );
      }

      const validated = CleaningOptionsSchema.safeParse(parsedJson);
      if (!validated.success) {
        const issues = validated.error.issues
          .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
          .join('; ');
        return NextResponse.json(
          { error: `Invalid cleaning options: ${issues}` },
          { status: 400 }
        );
      }
      parsedOptions = validated.data;
    }

    tempDir = await createTempDir();
    const results: CleanedFileResult[] = [];
    const errors: { fileName: string; error: string }[] = [];

    // Process files sequentially to maintain predictable resource and memory usage
    for (const file of files) {
      const fileName = file.name || 'unnamed_file';
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
          error: `File exceeds size limit (${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB)`,
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
            error: typeInfo.error || 'Invalid media file format signature',
          });
          continue;
        }

        const tempInputPath = path.join(tempDir, `in_${Date.now()}_${originalName}`);
        await fs.writeFile(tempInputPath, buffer);

        const res = await processFileCleaning({
          inputFilePath: tempInputPath,
          originalFileName: originalName,
          options: parsedOptions,
          outputDir: tempDir,
        });

        results.push(res);
      } catch (err: unknown) {
        console.error(`Error processing batch file ${fileName}:`, err);
        errors.push({
          fileName,
          error: sanitizeErrorMessage(err, 'Processing failed'),
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
    console.error('Batch route error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Batch cleaning failure.') },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
