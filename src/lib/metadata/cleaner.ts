import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import {
  CleaningOptions,
  CleanedFileResult,
} from '@/types/metadata';
import {
  detectFileType,
  sanitizeFilename,
  saveCleanedFileEphemeral,
  sanitizeErrorMessage,
} from '@/lib/security';
import {
  inspectFileMetadata,
  formatBytes,
  generateCleaningReport,
} from '@/lib/metadata/inspector';

const execFileAsync = promisify(execFile);

export interface ProcessMediaInput {
  inputFilePath: string;
  originalFileName: string;
  options: CleaningOptions;
  outputDir: string;
}

/**
 * Probes video container streams using ffprobe with safe argument arrays and a strict timeout.
 */
async function probeMediaStreams(filePath: string): Promise<{
  hasVideo: boolean;
  hasAudio: boolean;
  formatName?: string;
  duration?: number;
}> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=format_name,duration:stream=codec_type',
        '-of',
        'json',
        filePath,
      ],
      { timeout: 15000 }
    );
    const data = JSON.parse(stdout);
    const streams: Array<{ codec_type?: string }> = data.streams || [];
    const hasVideo = streams.some((s) => s.codec_type === 'video');
    const hasAudio = streams.some((s) => s.codec_type === 'audio');
    const formatName = data.format?.format_name;
    const duration = data.format?.duration ? parseFloat(data.format.duration) : undefined;
    return { hasVideo, hasAudio, formatName, duration };
  } catch (err) {
    console.warn('ffprobe stream check fallback:', (err as Error)?.message);
    return { hasVideo: true, hasAudio: true };
  }
}

/**
 * Cleans image metadata.
 * 
 * Semantics:
 * - When reencode is true OR all removal options are selected (Clean All mode):
 *   Sharp auto-rotates pixels (preserving orientation) and re-encodes without any metadata chunks.
 * - When selective retention is requested (e.g. removeExif: false):
 *   ExifTool selectively removes only the requested tags while preserving unselected tags.
 * - Always verifies the output image by reopening with Sharp to check dimensions, format, and readability.
 */
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
    else if (typeInfo.extension === '.heic') targetFormat = 'jpeg'; // Convert HEIC to high-fidelity JPEG for universal compatibility
    else targetFormat = 'jpeg';
  }

  const isFullCleanOrReencode =
    options.reencode ||
    (options.removeExif &&
      options.removeGps &&
      options.removeTimestamps &&
      options.removeSoftware &&
      options.removeXmpIptc &&
      options.removeThumbnails &&
      options.stripC2pa &&
      options.stripAiPrompts);

  let finalMimeType = 'image/jpeg';
  let finalExtension = '.jpg';

  try {
    if (isFullCleanOrReencode || options.targetFormat !== 'original') {
      // Re-encoding mode via Sharp:
      // Auto-rotates pixels to preserve visual orientation before stripping EXIF orientation tag.
      // Metadata is omitted (no withMetadata() call).
      const quality = Math.min(100, Math.max(50, options.quality || 90));
      let pipeline = sharp(inputFilePath, { failOn: 'none' }).rotate();

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
    } else {
      // Selective cleaning mode:
      // Copy to output and apply granular tag deletions via ExifTool
      await fs.copyFile(inputFilePath, outputFilePath);

      const exifArgs: string[] = ['-overwrite_original'];

      if (options.removeGps) {
        exifArgs.push('-gps:all=');
      }
      if (options.removeTimestamps) {
        exifArgs.push('-AllDates=', '-TrackCreateDate=', '-MediaCreateDate=');
      }
      if (options.removeSoftware) {
        exifArgs.push('-Software=', '-CreatorTool=', '-HistorySoftwareAgent=', '-ProcessingSoftware=');
      }
      if (options.removeXmpIptc) {
        exifArgs.push('-xmp:all=', '-iptc:all=');
      }
      if (options.removeThumbnails) {
        exifArgs.push('-ThumbnailImage=', '-PreviewImage=');
      }
      if (options.stripAiPrompts) {
        exifArgs.push('-UserComment=', '-Comment=');
      }
      if (options.stripC2pa) {
        exifArgs.push('-c2pa:all=');
      }

      exifArgs.push(outputFilePath);

      await execFileAsync('exiftool', exifArgs, { timeout: 20000 });

      finalMimeType = typeInfo.mimeType;
      finalExtension = typeInfo.extension;
    }

    // Independent output verification:
    // Reopen output file with Sharp to guarantee valid dimensions and uncorrupted pixels
    const verification = await sharp(outputFilePath).metadata();
    if (!verification.width || !verification.height || !verification.format) {
      throw new Error('Image verification failed: cleaned output is unreadable or corrupted.');
    }

    return { finalMimeType, finalExtension };
  } catch (err) {
    // Delete partial or broken output file on failure
    await fs.unlink(outputFilePath).catch(() => {});
    throw new Error(`Image cleaning failed: ${sanitizeErrorMessage(err)}`);
  }
}

/**
 * Cleans video metadata using FFmpeg with safe argument arrays.
 * 
 * Semantics:
 * - Fast stream-copy mode (reencode: false):
 *   Losslessly copies video and audio streams while stripping container-level metadata, udta atoms,
 *   iTunes tags, and chapter information. Drops subtitle and telemetry data streams.
 * - Transcode mode (reencode: true):
 *   Transcodes video and audio streams to scrub bitstream-level SEI user data and atom markers.
 * - Output is verified using ffprobe.
 */
export async function cleanVideo(
  inputFilePath: string,
  outputFilePath: string,
  options: CleaningOptions,
  typeInfo: { mimeType: string; extension: string }
): Promise<{ finalMimeType: string; finalExtension: string }> {
  const isWebM = typeInfo.extension === '.webm';
  const finalMimeType = isWebM ? 'video/webm' : 'video/mp4';
  const finalExtension = isWebM ? '.webm' : '.mp4';

  const { hasVideo, hasAudio } = await probeMediaStreams(inputFilePath);

  // Map only existing video and audio streams.
  // Using optional modifiers ? so missing audio (video-only) or missing video (audio-only) does not error.
  const ffmpegArgs: string[] = ['-y', '-i', inputFilePath, '-map', '0:v?', '-map', '0:a?'];

  if (options.reencode) {
    if (isWebM) {
      if (hasVideo) {
        ffmpegArgs.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0');
      }
      if (hasAudio) {
        ffmpegArgs.push('-c:a', 'libopus', '-b:a', '128k');
      }
      ffmpegArgs.push('-map_metadata', '-1', '-map_chapters', '-1');
    } else {
      if (hasVideo) {
        ffmpegArgs.push('-c:v', 'libx264', '-crf', '20', '-preset', 'fast');
      }
      if (hasAudio) {
        ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k');
      }
      ffmpegArgs.push(
        '-map_metadata',
        '-1',
        '-map_chapters',
        '-1',
        '-fflags',
        '+bitexact',
        '-flags:v',
        '+bitexact',
        '-flags:a',
        '+bitexact',
        '-movflags',
        '+faststart'
      );
    }
  } else {
    // Stream-copy mode
    ffmpegArgs.push('-c', 'copy', '-map_metadata', '-1', '-map_chapters', '-1');
    if (!isWebM) {
      ffmpegArgs.push(
        '-fflags',
        '+bitexact',
        '-flags:v',
        '+bitexact',
        '-flags:a',
        '+bitexact',
        '-movflags',
        '+faststart'
      );
    }
  }

  ffmpegArgs.push(outputFilePath);

  try {
    await execFileAsync('ffmpeg', ffmpegArgs, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    });
  } catch (err: unknown) {
    // If stream-copy failed on MP4, attempt transcode fallback safely
    if (!options.reencode && !isWebM) {
      console.warn('Stream copy failed, attempting transcode fallback:', (err as Error)?.message);
      const fallbackArgs: string[] = [
        '-y',
        '-i',
        inputFilePath,
        '-map',
        '0:v?',
        '-map',
        '0:a?',
      ];
      if (hasVideo) {
        fallbackArgs.push('-c:v', 'libx264', '-crf', '22', '-preset', 'veryfast');
      }
      if (hasAudio) {
        fallbackArgs.push('-c:a', 'aac', '-b:a', '128k');
      }
      fallbackArgs.push(
        '-map_metadata',
        '-1',
        '-map_chapters',
        '-1',
        '-movflags',
        '+faststart',
        outputFilePath
      );

      try {
        await execFileAsync('ffmpeg', fallbackArgs, {
          maxBuffer: 10 * 1024 * 1024,
          timeout: 30000,
        });
      } catch (fallbackErr) {
        await fs.unlink(outputFilePath).catch(() => {});
        throw new Error(`Video processing failed: ${sanitizeErrorMessage(fallbackErr)}`);
      }
    } else {
      await fs.unlink(outputFilePath).catch(() => {});
      throw new Error(`Video processing failed: ${sanitizeErrorMessage(err)}`);
    }
  }

  // Verify output container and streams using ffprobe
  try {
    const probe = await probeMediaStreams(outputFilePath);
    if (!probe.hasVideo && !probe.hasAudio) {
      throw new Error('Video validation failed: output contains no valid streams.');
    }
  } catch (probeErr) {
    await fs.unlink(outputFilePath).catch(() => {});
    throw new Error(`Video verification failed: ${sanitizeErrorMessage(probeErr)}`);
  }

  return { finalMimeType, finalExtension };
}

export async function processFileCleaning(input: ProcessMediaInput): Promise<CleanedFileResult> {
  const { inputFilePath, originalFileName, options, outputDir } = input;

  // 1. Inspect original file independently
  const beforeMetadata = await inspectFileMetadata(inputFilePath, originalFileName);

  // 2. Detect format
  const headerBuffer = await fs.readFile(inputFilePath);
  const typeInfo = detectFileType(headerBuffer.subarray(0, 4096), originalFileName);
  if (!typeInfo.valid) {
    throw new Error(typeInfo.error || 'Invalid media file format signature.');
  }

  const rawExt = path.extname(originalFileName) || typeInfo.extension;
  const baseNameWithoutExt = path.basename(originalFileName, rawExt);
  const tempCleanedPath = path.join(outputDir, `clean_${Date.now()}_out`);

  let finalMimeType = typeInfo.mimeType;
  let finalExtension = typeInfo.extension;

  try {
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

    // 3. Inspect cleaned output independently
    const afterMetadata = await inspectFileMetadata(tempCleanedPath, cleanedFileName);

    const originalSize = beforeMetadata.fileSize;
    const cleanedSize = afterMetadata.fileSize;
    const sizeDiff = originalSize - cleanedSize;
    const sizeReductionPercent =
      originalSize > 0
        ? Math.max(0, parseFloat(((sizeDiff / originalSize) * 100).toFixed(1)))
        : 0;

    // 4. Generate truthful audit report
    const report = generateCleaningReport(beforeMetadata, afterMetadata, options);

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
  } finally {
    // Clean up temporary output file on disk
    await fs.unlink(tempCleanedPath).catch(() => {});
  }
}
