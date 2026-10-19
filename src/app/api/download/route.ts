import { NextRequest, NextResponse } from 'next/server';
import { getCleanedFileEphemeral, isValidFileId } from '@/lib/security';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing file id parameter.' }, { status: 400 });
  }

  if (!isValidFileId(id)) {
    return NextResponse.json(
      { error: 'Invalid file ID format. Must be a valid UUID.' },
      { status: 400 }
    );
  }

  const stored = getCleanedFileEphemeral(id);
  if (!stored) {
    return NextResponse.json(
      { error: 'File not found or download link has expired for privacy reasons.' },
      { status: 404 }
    );
  }

  const uint8 = new Uint8Array(stored.buffer);

  return new Response(uint8, {
    status: 200,
    headers: {
      'Content-Type': stored.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(stored.fileName)}"`,
      'Content-Length': stored.buffer.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
