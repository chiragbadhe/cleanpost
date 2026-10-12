import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import {
  CleaningOptions,
  CleanedFileResult,
  CleaningReport,
} from '@/types/metadata';
import {
  detectFileType,
  sanitizeFilename,
  saveCleanedFileEphemeral,
} from '@/lib/security';
import { inspectFileMetadata, formatBytes } from '@/lib/metadata/inspector';

const execFileAsync = promisify(execFile);

export interface ProcessMediaInput {
  inputFilePath: string;
  originalFileName: string;
  options: CleaningOptions;
  outputDir: string;
}

export async function cleanImage(
  inputFilePath: string,
  outputFilePath: string,
  options: CleaningOptions,
  typeInfo: { mimeType: string; extension: string }
): Promise<{ finalMimeType: string; finalExtension: string }> {
  let targetFormat = options.targetFormat;
  if (targetFormat === 'original') {
    if (typeInfo.extension === '.jpg' || typeInfo.extension === '.jpeg') targetFormat = 'jpeg';
    else if (typeInfo.extension === '.png') targetFormat = 'png';
    else if (typeInfo.extension === '.webp') targetFormat = 'webp';
    else if (typeInfo.extension === '.heic') targetFormat = 'jpeg'; // Convert HEIC to high-res JPEG for compatibility
    else targetFormat = 'jpeg';
  }

  const quality = Math.min(100, Math.max(50, options.quality || 90));

  // Sharp automatically strips EXIF, XMP, IPTC, and proprietary chunks unless withMetadata() is passed.
  // Auto-rotate preserves correct orientation based on original EXIF before stripping it.
  let pipeline = sharp(inputFilePath, { failOn: 'none' }).rotate();

  let finalMimeType = 'image/jpeg';
  let finalExtension = '.jpg';

  if (targetFormat === 'png') {
    pipeline = pipeline.png({ compressionLevel: 8, adaptiveFiltering: true });
    finalMimeType = 'image/png';
    finalExtension = '.png';
  } else if (targetFormat === 'webp') {
    pipeline = pipeline.webp({ quality, effort: 4 });
    finalMimeType = 'image/webp';
    finalExtension = '.webp';
  } else {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    finalMimeType = 'image/jpeg';
    finalExtension = '.jpg';
  }

  await pipeline.toFile(outputFilePath);

  return { finalMimeType, finalExtension };
}

export async function cleanVideo(
  inputFilePath: string,
  outputFilePath: string,
  options: CleaningOptions,
  typeInfo: { mimeType: string; extension: string }
): Promise<{ finalMimeType: string; finalExtension: string }> {
  const isWebM = typeInfo.extension === '.webm';
  const finalMimeType = isWebM ? 'video/webm' : 'video/mp4';
  const finalExtension = isWebM ? '.webm' : '.mp4';

  const ffmpegArgs: string[] = ['-y', '-i', inputFilePath];

  if (options.reencode) {
    // Re-encoding scrubs deeper stream-level SEI / userData / atom traces
    if (isWebM) {
      ffmpegArgs.push(
        '-map', '0',
        '-c:v', 'libvpx-vp9',
        '-crf', '30',
        '-b:v', '0',
        '-c:a', 'libopus',
        '-b:a', '128k',
        '-map_metadata', '-1',
        '-map_chapters', '-1'
      );
    } else {
      ffmpegArgs.push(
        '-map', '0:v:0',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-crf', '20',
        '-preset', 'fast',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-map_metadata', '-1',
        '-map_chapters', '-1',
        '-fflags', '+bitexact',
        '-flags:v', '+bitexact',
        '-flags:a', '+bitexact',
        '-movflags', '+faststart'
      );
    }
  } else {
    // Fast stream copy stripping container metadata & udta tags
    if (isWebM) {
      ffmpegArgs.push(
        '-map', '0',
        '-c', 'copy',
        '-map_metadata', '-1',
        '-map_chapters', '-1'
      );
    } else {
      ffmpegArgs.push(
        '-map', '0',
        '-c', 'copy',
        '-map_metadata', '-1',
        '-map_chapters', '-1',
        '-fflags', '+bitexact',
        '-flags:v', '+bitexact',
        '-flags:a', '+bitexact',
        '-movflags', '+faststart'
      );
    }
  }

  ffmpegArgs.push(outputFilePath);

  try {
    await execFileAsync('ffmpeg', ffmpegArgs, { maxBuffer: 10 * 1024 * 1024 });
  } catch (err: unknown) {
    // If stream copy failed due to incompatible codecs/tags in MP4 container, try re-encoding
    if (!options.reencode && !isWebM) {
      console.warn('Fast video copy failed, attempting re-encode fallback:', (err as Error)?.message);
      const fallbackArgs = [
        '-y',
        '-i', inputFilePath,
        '-map', '0:v:0',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-crf', '22',
        '-preset', 'veryfast',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-map_metadata', '-1',
        '-map_chapters', '-1',
        '-movflags', '+faststart',
        outputFilePath,
      ];
      await execFileAsync('ffmpeg', fallbackArgs, { maxBuffer: 10 * 1024 * 1024 });
    } else {
      throw err;
    }
  }

  return { finalMimeType, finalExtension };
}

export async function processFileCleaning(input: ProcessMediaInput): Promise<CleanedFileResult> {
  const { inputFilePath, originalFileName, options, outputDir } = input;

  // 1. Inspect original file
  const beforeMetadata = await inspectFileMetadata(inputFilePath, originalFileName);

  // 2. Detect format
  const headerBuffer = await fs.readFile(inputFilePath);
  const typeInfo = detectFileType(headerBuffer.subarray(0, 4096), originalFileName);

  const rawExt = path.extname(originalFileName) || typeInfo.extension;
  const baseNameWithoutExt = path.basename(originalFileName, rawExt);
  const tempCleanedPath = path.join(outputDir, `clean_${Date.now()}_out`);

  let finalMimeType = typeInfo.mimeType;
  let finalExtension = typeInfo.extension;

  if (typeInfo.isImage) {
    const res = await cleanImage(inputFilePath, tempCleanedPath, options, typeInfo);
    finalMimeType = res.finalMimeType;
    finalExtension = res.finalExtension;
  } else if (typeInfo.isVideo) {
    const res = await cleanVideo(inputFilePath, tempCleanedPath, options, typeInfo);
    finalMimeType = res.finalMimeType;
    finalExtension = res.finalExtension;
  } else {
    throw new Error(`Unsupported media type for file: ${originalFileName}`);
  }

  const cleanedFileName = sanitizeFilename(`${baseNameWithoutExt}_clean${finalExtension}`, '');

  // 3. Inspect cleaned output
  const afterMetadata = await inspectFileMetadata(tempCleanedPath, cleanedFileName);

  const originalSize = beforeMetadata.fileSize;
  const cleanedSize = afterMetadata.fileSize;
  const sizeDiff = originalSize - cleanedSize;
  const sizeReductionPercent = originalSize > 0 ? Math.max(0, parseFloat(((sizeDiff / originalSize) * 100).toFixed(1))) : 0;

  // 4. Generate audit report
  const categoriesRemoved: string[] = [];
  const categoriesRetained: string[] = [];
  const notVerifiable: string[] = [];

  if (beforeMetadata.hasGps && !afterMetadata.hasGps) categoriesRemoved.push('GPS & Location Data');
  else if (afterMetadata.hasGps) categoriesRetained.push('GPS Data');

  if (beforeMetadata.hasDeviceDetails && !afterMetadata.hasDeviceDetails) categoriesRemoved.push('Camera & Device Details');
  else if (afterMetadata.hasDeviceDetails) categoriesRetained.push('Device Details');

  if (beforeMetadata.hasTimestamps && !afterMetadata.hasTimestamps) categoriesRemoved.push('Original Timestamps & Date Created');
  else if (afterMetadata.hasTimestamps) categoriesRetained.push('Timestamps');

  if (beforeMetadata.hasSoftware && !afterMetadata.hasSoftware) categoriesRemoved.push('Editing Software Identifiers');
  else if (afterMetadata.hasSoftware) categoriesRetained.push('Software Tags');

  if (beforeMetadata.hasXmp && !afterMetadata.hasXmp) categoriesRemoved.push('XMP / IPTC Metadata');
  if (beforeMetadata.hasThumbnails && !afterMetadata.hasThumbnails) categoriesRemoved.push('Embedded Thumbnails');

  if (beforeMetadata.hasC2pa && !afterMetadata.hasC2pa) {
    categoriesRemoved.push('C2PA Content Credentials Manifests');
  }

  if (beforeMetadata.hasAiIndicators && !afterMetadata.hasAiIndicators) {
    categoriesRemoved.push('Generative AI Prompt & Generation Metadata');
  }

  // Not verifiable items
  notVerifiable.push('Platform-side AI labels (applied by social networks upon upload)');
  notVerifiable.push('Invisible latent model watermarks (e.g. SynthID acoustic/visual embeddings)');

  const report: CleaningReport = {
    categoriesRemoved,
    categoriesRetained,
    notVerifiable,
    aiRemovalNotice: beforeMetadata.hasAiIndicators
      ? 'Embedded generation prompts and metadata headers were stripped. Visual structure is preserved.'
      : undefined,
    c2paNotice: beforeMetadata.hasC2pa
      ? 'C2PA manifest boxes removed from file container.'
      : undefined,
  };

  // 5. Store cleaned file in ephemeral memory store for download
  const cleanedBuffer = await fs.readFile(tempCleanedPath);
  const { id: fileId, expiresAt } = saveCleanedFileEphemeral(
    cleanedBuffer,
    cleanedFileName,
    finalMimeType
  );

  return {
    fileId,
    originalFileName,
    cleanedFileName,
    mimeType: finalMimeType,
    originalSize,
    cleanedSize,
    originalSizeFormatted: formatBytes(originalSize),
    cleanedSizeFormatted: formatBytes(cleanedSize),
    sizeDifferenceBytes: sizeDiff,
    sizeReductionPercent,
    cleaningOptionsUsed: options,
    report,
    beforeMetadata,
    afterMetadata,
    downloadUrl: `/api/download?id=${fileId}`,
    downloadExpiresAt: expiresAt.toISOString(),
  };
}
