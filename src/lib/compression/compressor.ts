import fs from 'node:fs/promises';
import path from 'node:path';
import sharp, { Sharp } from 'sharp';
import {
  CompressionOptions,
  CompressedFileResult,
} from '@/types/compression';
import {
  detectFileType,
  sanitizeFilename,
  saveCleanedFileEphemeral,
} from '@/lib/security';
import { formatBytes } from '@/lib/metadata/inspector';

export interface ProcessCompressionInput {
  inputFilePath: string;
  originalFileName: string;
  options: CompressionOptions;
  outputDir: string;
}

export interface EncodeConfig {
  targetFormat: 'jpeg' | 'png' | 'webp';
  quality: number;
  hasAlpha: boolean;
  options: CompressionOptions;
}

/**
 * Builds a Sharp pipeline applying rotation, resizing, color flattening,
 * metadata policy, and format encoding.
 */
function buildPipeline(
  inputFilePath: string,
  config: EncodeConfig
): Sharp {
  const { targetFormat, quality, hasAlpha, options } = config;

  let pipeline = sharp(inputFilePath, { failOn: 'none' }).rotate();

  // Resizing configuration
  if (options.maxWidth || options.maxHeight) {
    pipeline = pipeline.resize({
      width: options.maxWidth,
      height: options.maxHeight,
      fit: options.preserveAspectRatio ? 'inside' : 'fill',
      withoutEnlargement: !options.allowUpscaling,
    });
  }

  // Metadata retention policy
  if (!options.stripMetadata) {
    pipeline = pipeline.withMetadata();
  }

  // Transparency handling when converting to JPEG (JPEG lacks alpha support)
  if (targetFormat === 'jpeg') {
    if (hasAlpha) {
      // Flatten against clean white background so transparent pixels don't turn black
      pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    }
    return pipeline.jpeg({
      quality,
      mozjpeg: true,
      chromaSubsampling: quality >= 90 ? '4:4:4' : '4:2:0',
    });
  }

  if (targetFormat === 'webp') {
    return pipeline.webp({
      quality,
      effort: 4,
    });
  }

  // PNG encoding
  // Lossless by default with high compression. If quality < 90, enable palette quantization
  if (quality < 90) {
    return pipeline.png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: true,
      quality,
    });
  }

  return pipeline.png({
    compressionLevel: 9,
    adaptiveFiltering: true,
  });
}

/**
 * Iterative quality optimization to meet a target file size.
 * Uses binary search over quality for lossy formats (JPEG/WebP).
 */
async function optimizeForTargetSize(
  inputFilePath: string,
  targetFormat: 'jpeg' | 'png' | 'webp',
  initialQuality: number,
  targetSizeBytes: number,
  hasAlpha: boolean,
  options: CompressionOptions
): Promise<{
  buffer: Buffer;
  appliedQuality: number;
  achieved: boolean;
  notice?: string;
}> {
  if (targetFormat === 'png') {
    // Attempt standard lossless first
    const losslessConfig: EncodeConfig = {
      targetFormat,
      quality: 100,
      hasAlpha,
      options,
    };
    const standardBuffer = await buildPipeline(inputFilePath, losslessConfig).toBuffer();
    if (standardBuffer.byteLength <= targetSizeBytes) {
      return { buffer: standardBuffer, appliedQuality: 100, achieved: true };
    }

    // Try quantized palette PNG if lossless exceeds target
    const quantConfig: EncodeConfig = {
      targetFormat,
      quality: Math.min(80, initialQuality),
      hasAlpha,
      options,
    };
    const quantBuffer = await buildPipeline(inputFilePath, quantConfig).toBuffer();
    if (quantBuffer.byteLength <= targetSizeBytes) {
      return { buffer: quantBuffer, appliedQuality: quantConfig.quality, achieved: true };
    }

    // Target cannot be met with PNG
    return {
      buffer: quantBuffer,
      appliedQuality: quantConfig.quality,
      achieved: false,
      notice: `Target size of ${formatBytes(targetSizeBytes)} cannot be met with PNG format. Minimum achieved: ${formatBytes(quantBuffer.byteLength)}. Consider WebP for higher compression.`,
    };
  }

  // Binary search quality for lossy formats (JPEG & WebP)
  let minQ = 10;
  let maxQ = Math.min(95, Math.max(15, initialQuality));
  let bestBuffer: Buffer | null = null;
  let bestQuality = minQ;

  // Run up to 6 iterations for fast convergence
  for (let i = 0; i < 6 && minQ <= maxQ; i++) {
    const midQ = Math.round((minQ + maxQ) / 2);
    const candidateConfig: EncodeConfig = {
      targetFormat,
      quality: midQ,
      hasAlpha,
      options,
    };
    const buf = await buildPipeline(inputFilePath, candidateConfig).toBuffer();

    if (buf.byteLength <= targetSizeBytes) {
      // Meets target! Record and try higher quality
      bestBuffer = buf;
      bestQuality = midQ;
      minQ = midQ + 1;
    } else {
      // Exceeds target! Lower quality
      maxQ = midQ - 1;
      if (!bestBuffer) {
        bestBuffer = buf;
        bestQuality = midQ;
      }
    }
  }

  // If even lowest tested buffer exceeds target, test absolute minimum quality (10)
  if (bestBuffer && bestBuffer.byteLength > targetSizeBytes) {
    const minConfig: EncodeConfig = {
      targetFormat,
      quality: 10,
      hasAlpha,
      options,
    };
    const minBuf = await buildPipeline(inputFilePath, minConfig).toBuffer();
    if (minBuf.byteLength <= targetSizeBytes) {
      return { buffer: minBuf, appliedQuality: 10, achieved: true };
    }

    return {
      buffer: minBuf,
      appliedQuality: 10,
      achieved: false,
      notice: `Target size of ${formatBytes(targetSizeBytes)} could not be reached without unacceptable quality loss. Minimum size reached: ${formatBytes(minBuf.byteLength)}.`,
    };
  }

  return {
    buffer: bestBuffer!,
    appliedQuality: bestQuality,
    achieved: true,
  };
}

/**
 * Primary image compression processor.
 */
export async function processImageCompression(
  input: ProcessCompressionInput
): Promise<CompressedFileResult> {
  const { inputFilePath, originalFileName, options } = input;

  // 1. Validate file signature and verify it is an image
  const headerBuffer = await fs.readFile(inputFilePath);
  const typeInfo = detectFileType(headerBuffer.subarray(0, 4096), originalFileName);
  if (!typeInfo.valid || !typeInfo.isImage) {
    throw new Error(
      typeInfo.error ||
        `File ${originalFileName} is not a supported image format. Only JPEG, PNG, WebP, and HEIC images can be compressed.`
    );
  }

  // 2. Read metadata of input image
  const inMeta = await sharp(inputFilePath, { failOn: 'none' }).metadata();
  if (!inMeta.width || !inMeta.height || !inMeta.format) {
    throw new Error(`Corrupted or unreadable image file: ${originalFileName}`);
  }

  const originalSize = (await fs.stat(inputFilePath)).size;
  const originalDimensions = {
    width: inMeta.width,
    height: inMeta.height,
  };

  const hasAlpha = Boolean(inMeta.hasAlpha || inMeta.channels === 4);

  // 3. Resolve target format
  let targetFormat: 'jpeg' | 'png' | 'webp' = 'jpeg';
  if (options.targetFormat === 'original') {
    if (typeInfo.extension === '.png') targetFormat = 'png';
    else if (typeInfo.extension === '.webp') targetFormat = 'webp';
    else targetFormat = 'jpeg'; // jpeg, heic, and other formats default to jpeg
  } else {
    targetFormat = options.targetFormat;
  }

  let transparencyHandled: string | undefined;
  if (hasAlpha && targetFormat === 'jpeg') {
    transparencyHandled =
      'Transparency flattened onto white background (JPEG lacks transparency support)';
  } else if (hasAlpha) {
    transparencyHandled = 'Transparency preserved';
  }

  // 4. Compress image buffer
  let outputBuffer: Buffer;
  let appliedQuality = options.quality;
  let targetSizeAchieved: boolean | undefined;
  let targetSizeNotice: string | undefined;

  if (options.targetSizeBytes && options.targetSizeBytes > 0) {
    const result = await optimizeForTargetSize(
      inputFilePath,
      targetFormat,
      options.quality,
      options.targetSizeBytes,
      hasAlpha,
      options
    );
    outputBuffer = result.buffer;
    appliedQuality = result.appliedQuality;
    targetSizeAchieved = result.achieved;
    targetSizeNotice = result.notice;
  } else {
    const config: EncodeConfig = {
      targetFormat,
      quality: options.quality,
      hasAlpha,
      options,
    };
    outputBuffer = await buildPipeline(inputFilePath, config).toBuffer();
  }

  // 5. Verify output image integrity and dimensions
  const outMeta = await sharp(outputBuffer).metadata();
  if (!outMeta.width || !outMeta.height || !outMeta.format) {
    throw new Error('Image compression output verification failed: generated image is unreadable.');
  }

  const compressedSize = outputBuffer.byteLength;
  const sizeDiff = originalSize - compressedSize;
  const isLarger = compressedSize > originalSize;
  const sizeReductionPercent =
    originalSize > 0
      ? parseFloat((((originalSize - compressedSize) / originalSize) * 100).toFixed(1))
      : 0;

  // 6. Generate safe output filename with correct extension
  const extMap: Record<string, string> = {
    jpeg: '.jpg',
    png: '.png',
    webp: '.webp',
  };
  const finalExt = extMap[targetFormat] || '.jpg';
  const finalMimeType = `image/${targetFormat}`;

  const rawExt = path.extname(originalFileName);
  const baseName = path.basename(originalFileName, rawExt);
  const cleanBase = sanitizeFilename(baseName, '');
  const compressedFileName = `${cleanBase}-compressed${finalExt}`;

  // 7. Store compressed file ephemerally for secure download
  const { id: fileId, expiresAt } = saveCleanedFileEphemeral(
    outputBuffer,
    compressedFileName,
    finalMimeType
  );

  // 8. Generate preview data URL if size is within reasonable bounds (up to 4MB) for instant comparison
  let previewDataUrl: string | undefined;
  if (outputBuffer.byteLength <= 4 * 1024 * 1024) {
    previewDataUrl = `data:${finalMimeType};base64,${outputBuffer.toString('base64')}`;
  }

  return {
    fileId,
    originalFileName,
    compressedFileName,
    mimeType: finalMimeType,
    format: targetFormat,
    originalSize,
    compressedSize,
    originalSizeFormatted: formatBytes(originalSize),
    compressedSizeFormatted: formatBytes(compressedSize),
    sizeDifferenceBytes: sizeDiff,
    sizeReductionPercent,
    isLarger,
    originalDimensions,
    compressedDimensions: {
      width: outMeta.width,
      height: outMeta.height,
    },
    appliedQuality,
    appliedFormat: targetFormat.toUpperCase(),
    targetSizeRequested: options.targetSizeBytes,
    targetSizeAchieved,
    targetSizeNotice,
    metadataStripped: options.stripMetadata,
    hasTransparency: hasAlpha,
    transparencyHandled,
    downloadUrl: `/api/download?id=${fileId}`,
    downloadExpiresAt: expiresAt.toISOString(),
    previewDataUrl,
  };
}
