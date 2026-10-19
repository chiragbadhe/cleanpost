import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as cleanRoute } from '../metadata/clean/route';
import { POST as inspectRoute } from '../metadata/inspect/route';
import { GET as downloadRoute } from '../download/route';

describe('CleanPost API Routes Input Validation Suite', () => {
  it('returns HTTP 400 when no file is uploaded', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost:3000/api/metadata/clean', {
      method: 'POST',
      body: formData,
    });

    const res = await cleanRoute(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('No file uploaded');
  });

  it('returns HTTP 400 for invalid options JSON payload (Coverage: Requirement 7.1)', async () => {
    const formData = new FormData();
    // Valid minimal JPEG signature
    const validJpg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])], {
      type: 'image/jpeg',
    });
    formData.append('file', validJpg, 'test.jpg');
    formData.append('options', 'invalid json string {{{');

    const req = new NextRequest('http://localhost:3000/api/metadata/clean', {
      method: 'POST',
      body: formData,
    });

    const res = await cleanRoute(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid JSON payload');
  });

  it('returns HTTP 400 for out-of-range option values (Coverage: Requirement 7.1)', async () => {
    const formData = new FormData();
    const validJpg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])], {
      type: 'image/jpeg',
    });
    formData.append('file', validJpg, 'test.jpg');
    // quality: 150 is out of bounds (max: 100)
    formData.append('options', JSON.stringify({ quality: 150, removeGps: true }));

    const req = new NextRequest('http://localhost:3000/api/metadata/clean', {
      method: 'POST',
      body: formData,
    });

    const res = await cleanRoute(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid cleaning options');
  });

  it('returns HTTP 400 for invalid file signatures (Coverage: Requirement 7.3)', async () => {
    const formData = new FormData();
    // Plain text buffer pretending to be an image
    const textBlob = new Blob([Buffer.from('not an image at all, just text')], {
      type: 'image/jpeg',
    });
    formData.append('file', textBlob, 'fake.jpg');

    const req = new NextRequest('http://localhost:3000/api/metadata/clean', {
      method: 'POST',
      body: formData,
    });

    const res = await cleanRoute(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid file signature');
  });

  it('returns HTTP 400 for invalid file ID on /api/download', async () => {
    const req = new NextRequest('http://localhost:3000/api/download?id=invalid-id-../../etc', {
      method: 'GET',
    });

    const res = await downloadRoute(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid file ID format');
  });

  it('returns HTTP 404 for nonexistent/expired UUID on /api/download', async () => {
    const req = new NextRequest('http://localhost:3000/api/download?id=00000000-0000-0000-0000-000000000000', {
      method: 'GET',
    });

    const res = await downloadRoute(req);
    expect(res.status).toBe(404);
  });

  it('returns HTTP 400 when no file is uploaded to /api/metadata/inspect', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost:3000/api/metadata/inspect', {
      method: 'POST',
      body: formData,
    });

    const res = await inspectRoute(req);
    expect(res.status).toBe(400);
  });
});
