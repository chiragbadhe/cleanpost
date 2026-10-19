import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { POST as compressRoute } from '../compress/route';
import { POST as batchCompressRoute } from '../compress/batch/route';
import { GET as downloadRoute } from '../download/route';

describe('CleanPost Image Compression API Endpoints Suite', () => {
  let sampleJpgBuffer: Buffer;
  let samplePngBuffer: Buffer;

  beforeAll(async () => {
    sampleJpgBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 100, g: 150, b: 200 } },
    })
      .jpeg()
      .toBuffer();

    samplePngBuffer = await sharp({
      create: { width: 80, height: 80, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.8 } },
    })
      .png()
      .toBuffer();
  });

  it('returns HTTP 400 when no file is uploaded to /api/compress', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost:3000/api/compress', {
      method: 'POST',
      body: formData,
    });

    const res = await compressRoute(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('No image file uploaded');
  });

  it('returns HTTP 400 when file is empty (0 bytes) on /api/compress', async () => {
    const formData = new FormData();
    const emptyBlob = new Blob([], { type: 'image/jpeg' });
    formData.append('file', emptyBlob, 'empty.jpg');

    const req = new NextRequest('http://localhost:3000/api/compress', {
      method: 'POST',
      body: formData,
    });

    const res = await compressRoute(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Uploaded file is empty');
  });

  it('returns HTTP 400 when invalid/corrupted file signature is sent to /api/compress', async () => {
    const formData = new FormData();
    const fakeBlob = new Blob([Buffer.from('not an image header at all')], { type: 'image/jpeg' });
    formData.append('file', fakeBlob, 'fake.jpg');

    const req = new NextRequest('http://localhost:3000/api/compress', {
      method: 'POST',
      body: formData,
    });

    const res = await compressRoute(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid file signature');
  });

  it('successfully compresses JPEG and makes it downloadable', async () => {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(sampleJpgBuffer)], { type: 'image/jpeg' });
    formData.append('file', blob, 'vacation.jpg');
    formData.append(
      'options',
      JSON.stringify({
        quality: 75,
        preset: 'balanced',
        targetFormat: 'original',
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: true,
      })
    );

    const req = new NextRequest('http://localhost:3000/api/compress', {
      method: 'POST',
      body: formData,
    });

    const res = await compressRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.result.compressedFileName).toBe('vacation-compressed.jpg');
    expect(data.result.format).toBe('jpeg');
    expect(data.result.downloadUrl).toMatch(/\/api\/download\?id=/);

    // Verify download endpoint serves the compressed file
    const downloadReq = new NextRequest(`http://localhost:3000${data.result.downloadUrl}`, {
      method: 'GET',
    });
    const downloadRes = await downloadRoute(downloadReq);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers.get('Content-Type')).toBe('image/jpeg');
  });

  it('compresses PNG to WebP format via /api/compress', async () => {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(samplePngBuffer)], { type: 'image/png' });
    formData.append('file', blob, 'logo.png');
    formData.append(
      'options',
      JSON.stringify({
        quality: 80,
        preset: 'balanced',
        targetFormat: 'webp',
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: true,
      })
    );

    const req = new NextRequest('http://localhost:3000/api/compress', {
      method: 'POST',
      body: formData,
    });

    const res = await compressRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.result.compressedFileName).toBe('logo-compressed.webp');
    expect(data.result.format).toBe('webp');
    expect(data.result.mimeType).toBe('image/webp');
  });

  it('processes batch compression and handles partial failures gracefully', async () => {
    const formData = new FormData();
    const validBlob = new Blob([new Uint8Array(sampleJpgBuffer)], { type: 'image/jpeg' });
    const invalidBlob = new Blob([new Uint8Array(Buffer.from('not an image'))], { type: 'image/jpeg' });

    formData.append('files', validBlob, 'valid1.jpg');
    formData.append('files', invalidBlob, 'corrupt.jpg');
    formData.append('files', validBlob, 'valid2.jpg');

    formData.append(
      'options',
      JSON.stringify({
        quality: 80,
        preset: 'balanced',
        targetFormat: 'original',
        preserveAspectRatio: true,
        allowUpscaling: false,
        stripMetadata: true,
      })
    );

    const req = new NextRequest('http://localhost:3000/api/compress/batch', {
      method: 'POST',
      body: formData,
    });

    const res = await batchCompressRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalProcessed).toBe(3);
    expect(data.successful).toBe(2);
    expect(data.failed).toBe(1);
    expect(data.results.length).toBe(2);
    expect(data.errors.length).toBe(1);
    expect(data.errors[0].fileName).toBe('corrupt.jpg');
  });
});
