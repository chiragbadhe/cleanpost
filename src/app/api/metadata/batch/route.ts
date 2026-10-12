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
import {
  CleaningOptionsSchema,
  CleaningOptions,
  CleanedFileResult,
} from '@/types/metadata';
import { processFileCleaning } from '@/lib/metadata/cleaner';

export async function POST(req: NextRequest) {
  let tempDir = '';

  try {
    const formData = await req.formData();
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
      try {
        const parsed = JSON.parse(optionsRaw);
        parsedOptions = CleaningOptionsSchema.parse(parsed);
      } catch (e) {
        console.warn('Batch options parse fallback:', e);
      }
    }

    tempDir = await createTempDir();
    const results: CleanedFileResult[] = [];
    const errors: { fileName: string; error: string }[] = [];

    // Process files sequentially to maintain predictable resource usage
    for (const file of files) {
      const fileName = file.name || 'unnamed_file';
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
            error: typeInfo.error || 'Unsupported media file type',
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
          error: (err as Error)?.message || 'Processing failed',
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
      { error: (error as Error)?.message || 'Batch cleaning failure.' },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
