import { z } from 'zod';

export interface GpsCoordinates {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  direction?: number;
  speed?: number;
  timestamp?: string;
  mapsUrl?: string;
  raw?: Record<string, unknown>;
}

export interface DeviceInfo {
  make?: string;
  model?: string;
  lensModel?: string;
  serialNumber?: string;
  internalSerialNumber?: string;
  firmware?: string;
  ownerName?: string;
  raw?: Record<string, unknown>;
}

export interface TimestampInfo {
  dateTimeOriginal?: string;
  createDate?: string;
  modifyDate?: string;
  digitizedDate?: string;
  trackCreateDate?: string;
  raw?: Record<string, unknown>;
}

export interface SoftwareInfo {
  software?: string;
  creatorTool?: string;
  historySoftwareAgent?: string;
  processingSoftware?: string;
  encoder?: string;
  raw?: Record<string, unknown>;
}

export interface C2paInfo {
  detected: boolean;
  boxTypeFound?: string[];
  manifestCount?: number;
  details?: string[];
  raw?: Record<string, unknown>;
}

export interface AiIndicatorInfo {
  detected: boolean;
  confidence: 'none' | 'possible' | 'likely' | 'confirmed';
  reasons: string[];
  removable: boolean;
  toolIdentified?: string;
  promptFound?: string;
  digitalSourceType?: string;
  provenanceNotes?: string;
  cannotRemoveNotice?: string;
}

export interface FileMetadataSummary {
  fileName: string;
  fileSize: number;
  fileSizeFormatted: string;
  mimeType: string;
  format: string;
  dimensions?: {
    width?: number;
    height?: number;
    duration?: number;
    frameRate?: number;
    bitrate?: number;
  };
  hasExif: boolean;
  hasGps: boolean;
  hasDeviceDetails: boolean;
  hasTimestamps: boolean;
  hasSoftware: boolean;
  hasXmp: boolean;
  hasIptc: boolean;
  hasThumbnails: boolean;
  hasAiIndicators: boolean;
  hasC2pa: boolean;
  privacyRiskScore: 'low' | 'medium' | 'high' | 'critical';
  riskReasons: string[];
  categories: {
    exif: Record<string, unknown>;
    gps: GpsCoordinates;
    device: DeviceInfo;
    timestamps: TimestampInfo;
    software: SoftwareInfo;
    xmp: Record<string, unknown>;
    iptc: Record<string, unknown>;
    c2pa: C2paInfo;
    aiIndicators: AiIndicatorInfo;
  };
  rawTagCount: number;
  rawTags: Record<string, unknown>;
  inspectionErrors?: string[];
}

export const CleaningOptionsSchema = z
  .object({
    removeExif: z.boolean().default(true),
    removeGps: z.boolean().default(true),
    removeTimestamps: z.boolean().default(true),
    removeSoftware: z.boolean().default(true),
    removeXmpIptc: z.boolean().default(true),
    removeThumbnails: z.boolean().default(true),
    stripC2pa: z.boolean().default(true),
    stripAiPrompts: z.boolean().default(true),
    reencode: z.boolean().default(false),
    targetFormat: z.enum(['original', 'jpeg', 'png', 'webp', 'mp4']).default('original'),
    quality: z.number().int().min(50).max(100).default(90),
  })
  .strict();

export type CleaningOptions = z.infer<typeof CleaningOptionsSchema>;

export type CategoryCleaningStatus =
  | 'removed'
  | 'retained'
  | 'not_present'
  | 'not_verified'
  | 'unsupported';

export interface CategoryAuditResult {
  category: string;
  label: string;
  status: CategoryCleaningStatus;
  beforeEvidence?: string;
  afterEvidence?: string;
  details?: string;
}

export interface CleaningReport {
  overallStatus: 'verified_clean' | 'partially_clean' | 'retained_requested' | 'unverified';
  categories: Record<string, CategoryAuditResult>;
  categoriesRemoved: string[];
  categoriesRetained: string[];
  notPresent: string[];
  notVerifiable: string[];
  disclaimer: string;
  aiRemovalNotice?: string;
  c2paNotice?: string;
}

export interface CleanedFileResult {
  fileId: string;
  originalFileName: string;
  cleanedFileName: string;
  mimeType: string;
  originalSize: number;
  cleanedSize: number;
  originalSizeFormatted: string;
  cleanedSizeFormatted: string;
  sizeDifferenceBytes: number;
  sizeReductionPercent: number;
  cleaningOptionsUsed: CleaningOptions;
  report: CleaningReport;
  beforeMetadata: FileMetadataSummary;
  afterMetadata: FileMetadataSummary;
  downloadUrl: string;
  downloadExpiresAt: string;
}

export interface BatchProcessingResponse {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: CleanedFileResult[];
  errors: { fileName: string; error: string }[];
}
