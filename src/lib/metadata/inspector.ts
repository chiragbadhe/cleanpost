import fs from 'node:fs/promises';
import path from 'node:path';
import { exiftool, Tags } from 'exiftool-vendored';
import {
  FileMetadataSummary,
  GpsCoordinates,
  DeviceInfo,
  TimestampInfo,
  SoftwareInfo,
  C2paInfo,
  AiIndicatorInfo,
} from '@/types/metadata';
import { detectFileType } from '@/lib/security';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Direct buffer scanner for C2PA JUMBF boxes and embedded AI prompts
 * This complements ExifTool for formats where metadata chunks might not be registered as standard EXIF tags.
 */
export function scanBufferForAiAndC2pa(buffer: Buffer): {
  c2paDetected: boolean;
  c2paDetails: string[];
  aiDetected: boolean;
  aiConfidence: 'none' | 'possible' | 'likely' | 'confirmed';
  aiReasons: string[];
  toolIdentified?: string;
  promptFound?: string;
  digitalSourceType?: string;
} {
  const c2paDetails: string[] = [];
  const aiReasons: string[] = [];
  let c2paDetected = false;
  let aiDetected = false;
  let aiConfidence: 'none' | 'possible' | 'likely' | 'confirmed' = 'none';
  let toolIdentified: string | undefined;
  let promptFound: string | undefined;
  let digitalSourceType: string | undefined;

  // 1. Scan for C2PA JUMBF signatures in binary
  const binaryString = buffer.toString('latin1', 0, Math.min(buffer.length, 5 * 1024 * 1024)); // scan first 5MB
  
  if (binaryString.includes('c2pa') || binaryString.includes('c2pa.manifest') || binaryString.includes('c2pa.claim')) {
    c2paDetected = true;
    c2paDetails.push('C2PA Content Credentials manifest structure found in media stream.');
  }
  if (binaryString.includes('jumb') && binaryString.includes('c2pa')) {
    c2paDetected = true;
    c2paDetails.push('JUMBF superbox with C2PA identity detected.');
  }

  // 2. Scan for Generative AI markers in text chunks
  // A1111 / ComfyUI / Stable Diffusion
  if (binaryString.includes('parameters') && binaryString.includes('Steps:') && binaryString.includes('Sampler:')) {
    aiDetected = true;
    aiConfidence = 'confirmed';
    toolIdentified = 'Stable Diffusion (Automatic1111 / WebUI)';
    aiReasons.push('Stable Diffusion generation parameters embedded in PNG metadata (Steps, Sampler, CFG scale, Seed).');

    const paramIdx = binaryString.indexOf('parameters');
    if (paramIdx !== -1) {
      const snippet = binaryString.slice(paramIdx + 10, paramIdx + 260).replace(/[\0\r\n]/g, ' ');
      promptFound = snippet.trim();
    }
  } else if (binaryString.includes('prompt') && binaryString.includes('workflow') && binaryString.includes('class_type')) {
    aiDetected = true;
    aiConfidence = 'confirmed';
    toolIdentified = 'ComfyUI';
    aiReasons.push('ComfyUI node graph and prompt execution payload detected in metadata.');
  } else if (binaryString.includes('DreamStudio') || binaryString.includes('InvokeAI')) {
    aiDetected = true;
    aiConfidence = 'confirmed';
    toolIdentified = 'InvokeAI / DreamStudio';
    aiReasons.push('AI generation metadata markers detected.');
  }

  // Midjourney prompt indicators (--v 5, --v 6, --ar 16:9, --stylize, etc.)
  const mjMatch = binaryString.match(/--v\s+[0-9]+|--ar\s+[0-9]+:[0-9]+|--stylize\s+[0-9]+|--s\s+[0-9]+/);
  if (mjMatch) {
    aiDetected = true;
    aiConfidence = 'likely';
    toolIdentified = toolIdentified || 'Midjourney';
    aiReasons.push(`Midjourney generation parameters pattern (${mjMatch[0]}) detected.`);
  }

  // DALL-E / OpenAI markers
  if (binaryString.includes('dall-e') || binaryString.includes('DALL·E') || binaryString.includes('OpenAI')) {
    aiDetected = true;
    aiConfidence = aiConfidence === 'none' ? 'likely' : aiConfidence;
    toolIdentified = toolIdentified || 'OpenAI DALL-E';
    aiReasons.push('OpenAI / DALL-E generation provenance indicator found in metadata header.');
  }

  // Adobe Firefly / Content Credentials digitalSourceType
  if (binaryString.includes('trainedAlgorithmicMedia') || binaryString.includes('compositeWithTrainedAlgorithmicMedia')) {
    aiDetected = true;
    aiConfidence = 'confirmed';
    digitalSourceType = binaryString.includes('compositeWithTrainedAlgorithmicMedia')
      ? 'compositeWithTrainedAlgorithmicMedia (Composite AI)'
      : 'trainedAlgorithmicMedia (Pure Generative AI)';
    aiReasons.push(`IPTC / XMP digitalSourceType declared as "${digitalSourceType}".`);
  }

  if (binaryString.includes('Adobe Firefly') || binaryString.includes('Adobe Sensei')) {
    aiDetected = true;
    aiConfidence = 'confirmed';
    toolIdentified = toolIdentified || 'Adobe Firefly';
    aiReasons.push('Adobe Firefly generative fill / AI creation tags present.');
  }

  return {
    c2paDetected,
    c2paDetails,
    aiDetected,
    aiConfidence,
    aiReasons,
    toolIdentified,
    promptFound,
    digitalSourceType,
  };
}

export async function inspectFileMetadata(filePath: string, originalFileName?: string): Promise<FileMetadataSummary> {
  const fileName = originalFileName || path.basename(filePath);
  const stats = await fs.stat(filePath);
  const fileSize = stats.size;
  const fileSizeFormatted = formatBytes(fileSize);

  // Read header buffer for magic bytes and direct scanner
  const fileHandle = await fs.open(filePath, 'r');
  const bufferHeader = Buffer.alloc(Math.min(fileSize, 2 * 1024 * 1024)); // first 2MB
  await fileHandle.read(bufferHeader, 0, bufferHeader.length, 0);
  await fileHandle.close();

  const typeInfo = detectFileType(bufferHeader, fileName);
  const bufferScan = scanBufferForAiAndC2pa(bufferHeader);

  let rawTags: Tags = {};
  try {
    rawTags = await exiftool.read(filePath);
  } catch (err) {
    console.warn(`Exiftool read failed on ${filePath}, using fallback scanner:`, err);
  }

  // Extract GPS
  const gps: GpsCoordinates = {};
  if (rawTags.GPSLatitude !== undefined && rawTags.GPSLongitude !== undefined) {
    const lat = typeof rawTags.GPSLatitude === 'number' ? rawTags.GPSLatitude : parseFloat(String(rawTags.GPSLatitude));
    const lon = typeof rawTags.GPSLongitude === 'number' ? rawTags.GPSLongitude : parseFloat(String(rawTags.GPSLongitude));
    if (!isNaN(lat) && !isNaN(lon)) {
      gps.latitude = lat;
      gps.longitude = lon;
      gps.mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
    }
  }
  if (rawTags.GPSAltitude !== undefined) {
    gps.altitude = typeof rawTags.GPSAltitude === 'number' ? rawTags.GPSAltitude : parseFloat(String(rawTags.GPSAltitude));
  }
  if (rawTags.GPSSpeed !== undefined) {
    gps.speed = typeof rawTags.GPSSpeed === 'number' ? rawTags.GPSSpeed : undefined;
  }
  if (rawTags.GPSImgDirection !== undefined) {
    gps.direction = typeof rawTags.GPSImgDirection === 'number' ? rawTags.GPSImgDirection : undefined;
  }
  if (rawTags.GPSDateTime !== undefined) {
    gps.timestamp = String(rawTags.GPSDateTime);
  }

  const tagsRecord = rawTags as Record<string, unknown>;

  // Extract Device
  const device: DeviceInfo = {};
  if (rawTags.Make) device.make = String(rawTags.Make);
  if (rawTags.Model) device.model = String(rawTags.Model);
  if (rawTags.LensModel || rawTags.Lens) device.lensModel = String(rawTags.LensModel || rawTags.Lens);
  if (rawTags.SerialNumber || rawTags.CameraSerialNumber) {
    device.serialNumber = String(rawTags.SerialNumber || rawTags.CameraSerialNumber);
  }
  if (rawTags.InternalSerialNumber) device.internalSerialNumber = String(rawTags.InternalSerialNumber);
  if (rawTags.Firmware || tagsRecord.SoftwareVersion || tagsRecord.FirmwareVersion) {
    device.firmware = String(rawTags.Firmware || tagsRecord.SoftwareVersion || tagsRecord.FirmwareVersion);
  }
  if (rawTags.OwnerName || rawTags.Artist) device.ownerName = String(rawTags.OwnerName || rawTags.Artist);

  // Extract Timestamps
  const timestamps: TimestampInfo = {};
  if (rawTags.DateTimeOriginal) timestamps.dateTimeOriginal = String(rawTags.DateTimeOriginal);
  if (rawTags.CreateDate) timestamps.createDate = String(rawTags.CreateDate);
  if (rawTags.ModifyDate) timestamps.modifyDate = String(rawTags.ModifyDate);
  if (rawTags.DateCreated) timestamps.digitizedDate = String(rawTags.DateCreated);
  if (rawTags.TrackCreateDate) timestamps.trackCreateDate = String(rawTags.TrackCreateDate);

  // Extract Software
  const software: SoftwareInfo = {};
  if (rawTags.Software) software.software = String(rawTags.Software);
  if (rawTags.CreatorTool) software.creatorTool = String(rawTags.CreatorTool);
  if (tagsRecord.HistorySoftwareAgent) software.historySoftwareAgent = String(tagsRecord.HistorySoftwareAgent);
  if (rawTags.ProcessingSoftware) software.processingSoftware = String(rawTags.ProcessingSoftware);
  if (tagsRecord.Encoder || rawTags.CompressorName) software.encoder = String(tagsRecord.Encoder || rawTags.CompressorName);

  // Extract XMP & IPTC subsets
  const xmp: Record<string, unknown> = {};
  const iptc: Record<string, unknown> = {};
  const exif: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(rawTags)) {
    if (val === undefined || val === null) continue;
    if (key.startsWith('XMP-') || key.includes('xmp') || key.includes('XMP')) {
      xmp[key] = val;
    } else if (key.startsWith('IPTC') || ['Credit', 'By-line', 'Caption-Abstract', 'Keywords', 'Source', 'ObjectName'].includes(key)) {
      iptc[key] = val;
    } else if (['ISO', 'FNumber', 'ExposureTime', 'FocalLength', 'Flash', 'WhiteBalance', 'ExposureProgram', 'MeteringMode'].includes(key)) {
      exif[key] = val;
    }
  }

  // C2PA Info compilation
  const c2pa: C2paInfo = {
    detected: bufferScan.c2paDetected,
    details: [...bufferScan.c2paDetails],
    manifestCount: bufferScan.c2paDetected ? 1 : 0,
  };
  if (tagsRecord['C2PA'] || tagsRecord['ContentCredentials'] || tagsRecord['JUMBF']) {
    c2pa.detected = true;
    c2pa.details?.push('Exif metadata registers Content Credentials manifest records.');
  }

  // AI Indicators compilation
  const aiIndicators: AiIndicatorInfo = {
    detected: bufferScan.aiDetected,
    confidence: bufferScan.aiConfidence,
    reasons: [...bufferScan.aiReasons],
    removable: true,
    toolIdentified: bufferScan.toolIdentified,
    promptFound: bufferScan.promptFound,
    digitalSourceType: bufferScan.digitalSourceType,
  };

  // Additional ExifTool AI checks
  const digitalSource = tagsRecord['DigitalSourceType'] || tagsRecord['XMP:DigitalSourceType'];
  if (digitalSource) {
    aiIndicators.detected = true;
    aiIndicators.confidence = 'confirmed';
    aiIndicators.digitalSourceType = String(digitalSource);
    aiIndicators.reasons.push(`Standard digitalSourceType metadata tag: ${digitalSource}`);
  }

  const userComment = String(rawTags.UserComment || '');
  if (userComment.includes('Steps:') && userComment.includes('Sampler:')) {
    aiIndicators.detected = true;
    aiIndicators.confidence = 'confirmed';
    aiIndicators.toolIdentified = aiIndicators.toolIdentified || 'Stable Diffusion';
    aiIndicators.reasons.push('Stable Diffusion parameters found in EXIF UserComment.');
  }

  aiIndicators.cannotRemoveNotice =
    'Note: Cleaning will strip embedded metadata, prompt text, and C2PA credentials. However, it cannot guarantee complete AI-undetectability if the image contains invisible model watermarks (e.g., Google SynthID latent features) or if social media platforms perform server-side visual fingerprinting.';

  // Check thumbnails
  const hasThumbnails = Boolean(
    rawTags.ThumbnailImage ||
    rawTags.PreviewImage ||
    rawTags.JpgFromRaw ||
    rawTags.OtherImage ||
    tagsRecord.CoverArt
  );

  // Flags
  const hasGps = Boolean(gps.latitude !== undefined && gps.longitude !== undefined);
  const hasDeviceDetails = Boolean(device.make || device.model || device.serialNumber || device.lensModel);
  const hasTimestamps = Boolean(timestamps.dateTimeOriginal || timestamps.createDate);
  const hasSoftware = Boolean(software.software || software.creatorTool || software.historySoftwareAgent);
  const hasXmp = Object.keys(xmp).length > 0;
  const hasIptc = Object.keys(iptc).length > 0;
  const hasExif = Object.keys(exif).length > 0 || hasDeviceDetails || hasTimestamps;

  // Privacy Risk Scoring
  const riskReasons: string[] = [];
  let privacyRiskScore: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (hasGps) {
    privacyRiskScore = 'critical';
    riskReasons.push(`Exact GPS Coordinates exposed: ${gps.latitude?.toFixed(5)}, ${gps.longitude?.toFixed(5)}`);
  }
  if (device.serialNumber || device.internalSerialNumber || device.ownerName) {
    if (privacyRiskScore !== 'critical') privacyRiskScore = 'high';
    riskReasons.push('Device serial number or owner identity exposed.');
  }
  if (hasDeviceDetails && privacyRiskScore === 'low') {
    privacyRiskScore = 'medium';
    riskReasons.push(`Camera hardware details logged (${device.make || ''} ${device.model || ''}).`);
  }
  if (hasTimestamps && privacyRiskScore === 'low') {
    privacyRiskScore = 'medium';
    riskReasons.push(`Original creation timestamp recorded (${timestamps.dateTimeOriginal || timestamps.createDate}).`);
  }
  if (aiIndicators.detected) {
    if (privacyRiskScore === 'low') privacyRiskScore = 'medium';
    riskReasons.push(`AI provenance / generation marker detected (${aiIndicators.toolIdentified || 'AI Tool'}).`);
  }
  if (hasThumbnails) {
    riskReasons.push('Embedded original thumbnail found (may leak uncropped or unedited photo data).');
  }

  // Dimensions
  const width = typeof rawTags.ImageWidth === 'number' ? rawTags.ImageWidth : undefined;
  const height = typeof rawTags.ImageHeight === 'number' ? rawTags.ImageHeight : undefined;
  const duration = typeof rawTags.Duration === 'number' ? rawTags.Duration : undefined;
  const frameRate = typeof rawTags.VideoFrameRate === 'number' ? rawTags.VideoFrameRate : undefined;

  return {
    fileName,
    fileSize,
    fileSizeFormatted,
    mimeType: typeInfo.mimeType,
    format: typeInfo.extension.replace('.', '').toUpperCase(),
    dimensions: {
      width,
      height,
      duration,
      frameRate,
    },
    hasExif,
    hasGps,
    hasDeviceDetails,
    hasTimestamps,
    hasSoftware,
    hasXmp,
    hasIptc,
    hasThumbnails,
    hasAiIndicators: aiIndicators.detected,
    hasC2pa: c2pa.detected,
    privacyRiskScore,
    riskReasons,
    categories: {
      exif,
      gps,
      device,
      timestamps,
      software,
      xmp,
      iptc,
      c2pa,
      aiIndicators,
    },
    rawTagCount: Object.keys(rawTags).length,
    rawTags: rawTags as Record<string, unknown>,
  };
}
