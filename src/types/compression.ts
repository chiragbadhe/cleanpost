import { z } from 'zod';

export type CompressionPreset = 'low_size' | 'balanced' | 'high_quality' | 'custom';
export type OutputFormat = 'original' | 'jpeg' | 'png' | 'webp';

export const CompressionOptionsSchema = z
  .object({
    quality: z.number().int().min(1).max(100).default(80),
    preset: z.enum(['low_size', 'balanced', 'high_quality', 'custom']).default('balanced'),
    targetFormat: z.enum(['original', 'jpeg', 'png', 'webp']).default('original'),
    maxWidth: z.number().int().positive().max(10000).optional(),
    maxHeight: z.number().int().positive().max(10000).optional(),
    preserveAspectRatio: z.boolean().default(true),
    allowUpscaling: z.boolean().default(false),
    targetSizeBytes: z.number().int().positive().optional(),
    stripMetadata: z.boolean().default(true),
  })
  .strict();

export type CompressionOptions = z.infer<typeof CompressionOptionsSchema>;

export interface CompressedFileResult {
  fileId: string;
  originalFileName: string;
  compressedFileName: string;
  mimeType: string;
  format: string;
  originalSize: number;
  compressedSize: number;
  originalSizeFormatted: string;
  compressedSizeFormatted: string;
  sizeDifferenceBytes: number; // positive = saved bytes, negative = size increased
  sizeReductionPercent: number; // positive = percentage saved, negative = percentage increased
  isLarger: boolean;
  originalDimensions: {
    width: number;
    height: number;
  };
  compressedDimensions: {
    width: number;
    height: number;
  };
  appliedQuality: number;
  appliedFormat: string;
  targetSizeRequested?: number;
  targetSizeAchieved?: boolean;
  targetSizeNotice?: string;
  metadataStripped: boolean;
  hasTransparency: boolean;
  transparencyHandled?: string;
  downloadUrl: string;
  downloadExpiresAt: string;
  previewDataUrl?: string;
}

export interface BatchCompressionResponse {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: CompressedFileResult[];
  errors: { fileName: string; error: string }[];
}
