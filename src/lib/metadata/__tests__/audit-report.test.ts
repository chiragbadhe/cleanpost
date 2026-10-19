import { describe, it, expect } from 'vitest';
import { generateCleaningReport } from '../inspector';
import { FileMetadataSummary, CleaningOptions } from '@/types/metadata';

describe('CleanPost Audit Report & Verification Rules', () => {
  const defaultOptions: CleaningOptions = {
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

  const createMockSummary = (overrides: Partial<FileMetadataSummary>): FileMetadataSummary => ({
    fileName: 'test.jpg',
    fileSize: 100000,
    fileSizeFormatted: '100 KB',
    mimeType: 'image/jpeg',
    format: 'JPG',
    hasExif: false,
    hasGps: false,
    hasDeviceDetails: false,
    hasTimestamps: false,
    hasSoftware: false,
    hasXmp: false,
    hasIptc: false,
    hasThumbnails: false,
    hasAiIndicators: false,
    hasC2pa: false,
    privacyRiskScore: 'low',
    riskReasons: [],
    categories: {
      exif: {},
      gps: {},
      device: {},
      timestamps: {},
      software: {},
      xmp: {},
      iptc: {},
      c2pa: { detected: false },
      aiIndicators: { detected: false, confidence: 'none', reasons: [], removable: true },
    },
    rawTagCount: 10,
    rawTags: {},
    ...overrides,
  });

  it('reports "not_present" when a category was absent originally (Coverage: Requirement 7.7)', () => {
    // Original file had no GPS
    const before = createMockSummary({ hasGps: false });
    const after = createMockSummary({ hasGps: false });

    const report = generateCleaningReport(before, after, defaultOptions);

    expect(report.categories.gps.status).toBe('not_present');
    expect(report.categoriesRemoved).not.toContain('GPS & Location Coordinates');
    expect(report.notPresent).toContain('GPS & Location Coordinates');
  });

  it('reports "removed" only when present in before and verified absent in after (Coverage: Requirement 7.6)', () => {
    // Original had GPS, cleaned has no GPS
    const before = createMockSummary({
      hasGps: true,
      categories: {
        ...createMockSummary({}).categories,
        gps: { latitude: 37.77, longitude: -122.41 },
      },
    });
    const after = createMockSummary({ hasGps: false });

    const report = generateCleaningReport(before, after, defaultOptions);

    expect(report.categories.gps.status).toBe('removed');
    expect(report.categoriesRemoved).toContain('GPS & Location Coordinates');
    expect(report.categories.gps.beforeEvidence).toContain('37.77');
  });

  it('reports "retained" when metadata was requested to be removed but remained (Coverage: Requirement 7.8)', () => {
    // Metadata survived cleaning
    const before = createMockSummary({
      hasDeviceDetails: true,
      categories: {
        ...createMockSummary({}).categories,
        device: { make: 'Nikon', model: 'Z9' },
      },
    });
    const after = createMockSummary({
      hasDeviceDetails: true,
      categories: {
        ...createMockSummary({}).categories,
        device: { make: 'Nikon', model: 'Z9' },
      },
    });

    const report = generateCleaningReport(before, after, defaultOptions);

    expect(report.categories.device.status).toBe('retained');
    expect(report.categoriesRemoved).not.toContain('Camera & Device Details');
    expect(report.categoriesRetained).toContain('Camera & Device Details');
  });

  it('reports "not_verified" when inspection tool encounters an error (Coverage: Requirement 7.9)', () => {
    const before = createMockSummary({ hasC2pa: true });
    // After inspection failed with an error
    const after = createMockSummary({
      hasC2pa: false,
      inspectionErrors: ['ExifTool parsing error: corrupted container trailer'],
    });

    const report = generateCleaningReport(before, after, defaultOptions);

    expect(report.categories.c2pa.status).toBe('not_verified');
    expect(report.categoriesRemoved).not.toContain('C2PA Content Credentials Manifests');
    expect(report.notVerifiable).toContain('C2PA Content Credentials Manifests');
  });

  it('does NOT treat file-size reduction as proof of metadata removal (Coverage: Requirement 7.14)', () => {
    // Size dropped by 50%, but device details were retained
    const before = createMockSummary({
      fileSize: 200000,
      hasDeviceDetails: true,
      categories: {
        ...createMockSummary({}).categories,
        device: { make: 'Canon' },
      },
    });
    const after = createMockSummary({
      fileSize: 100000,
      hasDeviceDetails: true,
      categories: {
        ...createMockSummary({}).categories,
        device: { make: 'Canon' },
      },
    });

    const report = generateCleaningReport(before, after, defaultOptions);

    // File was smaller, but retained device metadata is truthfully reported
    expect(report.categories.device.status).toBe('retained');
    expect(report.categoriesRemoved).not.toContain('Camera & Device Details');
  });
});
