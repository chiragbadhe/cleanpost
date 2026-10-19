'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  UploadCloud,
  FileImage,
  Sparkles,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Columns,
  Archive,
  ShieldCheck,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import { CompressionOptions, CompressedFileResult } from '@/types/compression';
import { CompressionSettings } from './CompressionSettings';
import { ImageComparisonModal } from './ImageComparisonModal';
import { MAX_FILE_SIZE_BYTES } from '@/lib/constants';

export interface ImageQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'ready' | 'compressing' | 'completed' | 'failed';
  result: CompressedFileResult | null;
  error?: string;
  originalWidth?: number;
  originalHeight?: number;
}

export function ImageCompressorView() {
  const [queue, setQueue] = useState<ImageQueueItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [comparisonItem, setComparisonItem] = useState<ImageQueueItem | null>(null);
  const [dropzoneError, setDropzoneError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [options, setOptions] = useState<CompressionOptions>({
    quality: 80,
    preset: 'balanced',
    targetFormat: 'original',
    preserveAspectRatio: true,
    allowUpscaling: false,
    stripMetadata: true,
  });

  const showNotification = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 4000);
  };

  const validateAndAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setDropzoneError(null);

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      // Must be an image file
      const isImg =
        file.type.startsWith('image/') ||
        /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);

      if (!isImg) {
        errors.push(`${file.name} is not an image. CleanPost Compressor supports JPG, PNG, WebP, and HEIC.`);
        return;
      }

      if (file.size === 0) {
        errors.push(`${file.name} is empty (0 bytes).`);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`${file.name} exceeds the size limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setDropzoneError(errors.join(' '));
    }

    if (validFiles.length > 0) {
      const newItems: ImageQueueItem[] = validFiles.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        const item: ImageQueueItem = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          file,
          previewUrl,
          status: 'ready',
          result: null,
        };

        // Probe original dimensions client-side for immediate display
        const img = new Image();
        img.onload = () => {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, originalWidth: img.naturalWidth, originalHeight: img.naturalHeight }
                : q
            )
          );
        };
        img.src = previewUrl;

        return item;
      });

      setQueue((prev) => [...prev, ...newItems]);
      showNotification(`Added ${newItems.length} image${newItems.length > 1 ? 's' : ''} to compression queue.`);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessingBatch) setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isProcessingBatch) return;
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCompressSingle = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item) return;

    setQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: 'compressing', error: undefined } : q))
    );

    try {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('options', JSON.stringify(options));

      const res = await fetch('/api/compress', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Compression failed');
      }

      setQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                status: 'completed',
                result: data.result,
              }
            : q
        )
      );
      showNotification(`Compressed ${item.file.name}`);
    } catch (err: unknown) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, status: 'failed', error: (err as Error)?.message || 'Compression failed' }
            : q
        )
      );
    }
  };

  const handleCompressAll = async () => {
    const pendingItems = queue.filter(
      (q) => q.status === 'ready' || q.status === 'failed'
    );
    if (pendingItems.length === 0) return;

    setIsProcessingBatch(true);
    for (const item of pendingItems) {
      await handleCompressSingle(item.id);
    }
    setIsProcessingBatch(false);
    showNotification('Batch compression completed.');
  };

  const handleDownloadAllZip = async () => {
    const completedItems = queue.filter((q) => q.status === 'completed' && q.result);
    if (completedItems.length === 0) return;

    const fileIds = completedItems.map((q) => q.result!.fileId);

    try {
      showNotification('Generating ZIP archive of compressed images...');
      const res = await fetch('/api/download/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create ZIP');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `cleanpost_compressed_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showNotification('ZIP download started.');
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Failed to download ZIP archive.');
    }
  };

  const handleRemove = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((q) => q.id !== id);
    });
  };

  const handleClearQueue = () => {
    queue.forEach((q) => {
      if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
    });
    setQueue([]);
    showNotification('Queue cleared.');
  };

  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const pendingCount = queue.filter((q) => q.status === 'ready' || q.status === 'failed').length;

  return (
    <div className="space-y-8">
      {/* Toast Banner */}
      {statusNotification && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusNotification}</span>
        </div>
      )}

      {/* Main Dropzone for Images */}
      <div className="w-full space-y-3">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessingBatch && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 select-none ${
            isProcessingBatch
              ? 'opacity-60 cursor-not-allowed border-zinc-300 dark:border-zinc-800'
              : isDragOver
              ? 'border-emerald-500 bg-emerald-500/5 scale-[1.008] shadow-lg shadow-emerald-500/10'
              : 'border-zinc-300 dark:border-zinc-800 hover:border-emerald-500/70 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isProcessingBatch}
          />

          <div className="flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                isDragOver
                  ? 'bg-emerald-500 text-white scale-110 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Drag & drop images here for compression
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                or <span className="text-emerald-700 dark:text-emerald-400 underline font-medium">browse images</span> from your device
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50">
                <FileImage className="w-3.5 h-3.5 text-emerald-500" />
                JPG, PNG, WebP, HEIC
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                Adaptive Quality & Resizing
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Metadata Stripping Included
              </span>
            </div>

            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
              Server-side Sharp engine • Zero Data Retention
            </div>
          </div>
        </div>

        {dropzoneError && (
          <div className="flex items-center gap-2 p-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>{dropzoneError}</span>
          </div>
        )}
      </div>

      {/* Compression Controls */}
      <CompressionSettings
        options={options}
        onOptionsChange={setOptions}
        disabled={isProcessingBatch}
      />

      {/* Images Queue / Results */}
      {queue.length > 0 && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  Image Queue
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {queue.length}
                </span>
              </div>

              {completedCount > 0 && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {completedCount} Compressed
                </div>
              )}
            </div>

            {/* Batch Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleCompressAll}
                disabled={isProcessingBatch || pendingCount === 0}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isProcessingBatch ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Compress All Images
              </button>

              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Download All (ZIP)
                </button>
              )}

              <button
                type="button"
                onClick={handleClearQueue}
                disabled={isProcessingBatch}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                title="Clear All Images"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List of images */}
          <div className="space-y-3">
            {queue.map((item) => {
              const res = item.result;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-colors"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700/60">
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-xs"
                          title={item.file.name}
                        >
                          {item.file.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          {item.file.name.split('.').pop()}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span>Original: {(item.file.size / 1024).toFixed(1)} KB</span>

                        {item.originalWidth && item.originalHeight && (
                          <span className="font-mono">
                            {item.originalWidth}×{item.originalHeight}px
                          </span>
                        )}

                        {/* Compression Result Badges */}
                        {res && (
                          <>
                            <span className="text-zinc-300 dark:text-zinc-700">•</span>
                            <span
                              className={`inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                                res.isLarger
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {res.isLarger
                                ? `+${Math.abs(res.sizeReductionPercent)}% size (${(Math.abs(res.sizeDifferenceBytes) / 1024).toFixed(1)} KB increase)`
                                : `-${res.sizeReductionPercent}% (${res.compressedSizeFormatted})`}
                            </span>

                            {res.originalDimensions.width !== res.compressedDimensions.width && (
                              <span className="font-mono text-zinc-500 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" />
                                {res.compressedDimensions.width}×{res.compressedDimensions.height}px
                              </span>
                            )}

                            {res.targetSizeNotice && (
                              <span className="text-amber-500 text-[10px]" title={res.targetSizeNotice}>
                                Target adjusted
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {item.error && (
                        <div className="text-[11px] text-rose-500 flex items-center gap-1 pt-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{item.error}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/80">
                    {/* Status Pill */}
                    <div className="flex items-center gap-2">
                      {item.status === 'compressing' && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Compressing
                        </span>
                      )}
                      {item.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Compressed
                        </span>
                      )}
                    </div>

                    {/* Compare Button */}
                    {item.status === 'completed' && res && (
                      <button
                        type="button"
                        onClick={() => setComparisonItem(item)}
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Compare original vs compressed"
                      >
                        <Columns className="w-3.5 h-3.5 text-zinc-400" />
                        Compare
                      </button>
                    )}

                    {/* Download or Compress Button */}
                    {item.status === 'completed' && res ? (
                      <a
                        href={res.downloadUrl}
                        download={res.compressedFileName}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCompressSingle(item.id)}
                        disabled={item.status === 'compressing'}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                      >
                        {item.status === 'failed' ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5" /> Retry
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" /> Compress
                          </>
                        )}
                      </button>
                    )}

                    {/* Remove Item */}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      disabled={item.status === 'compressing'}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Privacy Guarantee Note */}
      <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            Privacy-First Ephemeral Compression
          </span>
          <p>
            Images are transformed securely in isolated memory and never logged, shared with 3rd parties, or persisted. Cleaned and compressed downloads expire automatically after 15 minutes.
          </p>
        </div>
      </div>

      {/* Comparison Modal */}
      <ImageComparisonModal
        isOpen={Boolean(comparisonItem && comparisonItem.result)}
        onClose={() => setComparisonItem(null)}
        result={comparisonItem?.result || null}
        originalPreviewUrl={comparisonItem?.previewUrl}
      />
    </div>
  );
}
