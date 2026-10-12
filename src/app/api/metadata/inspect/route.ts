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
import { inspectFileMetadata } from '@/lib/metadata/inspector';

export async function POST(req: NextRequest) {
  let tempDir = '';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

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
    const tempFilePath = path.join(tempDir, originalName);
    await fs.writeFile(tempFilePath, buffer);

    const summary = await inspectFileMetadata(tempFilePath, originalName);

    return NextResponse.json({
      success: true,
      metadata: summary,
    });
  } catch (error: unknown) {
    console.error('Inspection error:', error);
    return NextResponse.json(
      { error: (error as Error)?.message || 'Failed to inspect file metadata.' },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
