'use client';

import React from 'react';
import {
  FileText,
  FileImage,
  Film,
  Eye,
  Sparkles,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  Archive,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  CleaningOptions,
  CleanedFileResult,
  FileMetadataSummary,
} from '@/types/metadata';

export interface QueueItem {
  id: string;
  file: File;
  previewUrl?: string;
  status: 'ready' | 'scanning' | 'cleaning' | 'completed' | 'failed';
  metadata: FileMetadataSummary | null;
  cleanResult: CleanedFileResult | null;
  error?: string;
  progress?: number;
}

interface FileQueueProps {
  items: QueueItem[];
  options: CleaningOptions;
  onInspect: (item: QueueItem) => void;
  onCleanSingle: (id: string) => void;
  onRemove: (id: string) => void;
  onCleanAll: () => void;
  onScanAll: () => void;
  onDownloadAllZip: () => void;
  onClearQueue: () => void;
  onOpenOptions: () => void;
  isProcessingBatch: boolean;
}

export function FileQueue({
  items,
  options,
  onInspect,
  onCleanSingle,
  onRemove,
  onCleanAll,
  onScanAll,
  onDownloadAllZip,
  onClearQueue,
  onOpenOptions,
  isProcessingBatch,
}: FileQueueProps) {
  if (items.length === 0) return null;

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const pendingCount = items.filter(
    (i) => i.status === 'ready' || i.status === 'failed'
  ).length;

  return (
    <div className="w-full space-y-4">
      {/* Queue Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              Files in Queue
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              {items.length}
            </span>
          </div>

          {completedCount > 0 && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {completedCount} Cleaned
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onOpenOptions}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            Cleaning Rules
          </button>

          <button
            type="button"
            onClick={onScanAll}
            disabled={isProcessingBatch || pendingCount === 0}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Eye className="w-3.5 h-3.5" />
            Scan All
          </button>

          <button
            type="button"
            onClick={onCleanAll}
            disabled={isProcessingBatch || pendingCount === 0}
            className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {isProcessingBatch ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Clean All Queue
          </button>

          {completedCount > 0 && (
            <button
              type="button"
              onClick={onDownloadAllZip}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              Download All (ZIP)
            </button>
          )}

          <button
            type="button"
            onClick={onClearQueue}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Clear Queue"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue Items List */}
      <div className="space-y-2">
        {items.map((item) => {
          const isVideo = item.file.type.startsWith('video/');
          const risk = item.metadata?.privacyRiskScore;

          return (
            <div
              key={item.id}
              className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-colors"
            >
              {/* Media Preview & Info */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700/60">
                  {item.previewUrl ? (
                    isVideo ? (
                      <video
                        src={item.previewUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : isVideo ? (
                    <Film className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <FileImage className="w-5 h-5 text-zinc-400" />
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-xs" title={item.file.name}>
                      {item.file.name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {item.file.name.split('.').pop()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span>{(item.file.size / (1024 * 1024)).toFixed(2)} MB</span>

                    {/* Metadata Findings Tag */}
                    {risk && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium uppercase ${
                          risk === 'critical'
                            ? 'bg-rose-500/10 text-rose-500'
                            : risk === 'high'
                            ? 'bg-amber-500/10 text-amber-500'
                            : risk === 'medium'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-emerald-500/10 text-emerald-500'
                        }`}
                      >
                        {risk === 'critical' || risk === 'high' ? (
                          <ShieldAlert className="w-3 h-3" />
                        ) : (
                          <ShieldCheck className="w-3 h-3" />
                        )}
                        {risk} risk
                      </span>
                    )}

                    {/* AI Tag */}
                    {item.metadata?.hasAiIndicators && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/10 text-purple-500 font-medium">
                        AI Markers
                      </span>
                    )}

                    {/* Size reduction tag */}
                    {item.cleanResult && (
                      <span className="text-emerald-500 font-mono font-medium">
                        -{item.cleanResult.sizeReductionPercent}% size
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/80">
                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                  {item.status === 'scanning' && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-500 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" /> Scanning
                    </span>
                  )}
                  {item.status === 'cleaning' && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" /> Stripping
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cleaned
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}
                </div>

                {/* Inspect Action */}
                <button
                  type="button"
                  onClick={() => onInspect(item)}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-zinc-400" />
                  Inspect
                </button>

                {/* Clean or Download */}
                {item.status === 'completed' && item.cleanResult ? (
                  <a
                    href={item.cleanResult.downloadUrl}
                    download={item.cleanResult.cleanedFileName}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => onCleanSingle(item.id)}
                    disabled={item.status === 'cleaning'}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Clean
                  </button>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
