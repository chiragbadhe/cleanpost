import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getCleanedFileEphemeral, isValidFileId, sanitizeErrorMessage } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
    }

    const { fileIds } = (body || {}) as { fileIds?: unknown };

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'Please provide a non-empty array of fileIds.' }, { status: 400 });
    }

    // Validate each file ID
    for (const id of fileIds) {
      if (!isValidFileId(id)) {
        return NextResponse.json(
          { error: `Invalid file ID format in request: ${String(id).slice(0, 40)}` },
          { status: 400 }
        );
      }
    }

    const zip = new JSZip();
    let filesAdded = 0;

    for (const id of fileIds) {
      const stored = getCleanedFileEphemeral(id as string);
      if (stored) {
        zip.file(stored.fileName, stored.buffer);
        filesAdded++;
      }
    }

    if (filesAdded === 0) {
      return NextResponse.json(
        { error: 'All requested files have expired or are unavailable.' },
        { status: 404 }
      );
    }

    const zipBuffer = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipName = `cleanpost_batch_${timestamp}.zip`;

    return new NextResponse(Buffer.from(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
        'Content-Length': zipBuffer.byteLength.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    console.error('ZIP packaging error:', err);
    return NextResponse.json(
      { error: sanitizeErrorMessage(err, 'Failed to generate ZIP archive.') },
      { status: 500 }
    );
  }
}
