'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  Sliders,
  Maximize2,
  Columns,
  Layers,
  ArrowRight,
  ShieldCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { CompressedFileResult } from '@/types/compression';

interface ImageComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CompressedFileResult | null;
  originalPreviewUrl?: string;
}

export function ImageComparisonModal({
  isOpen,
  onClose,
  result,
  originalPreviewUrl,
}: ImageComparisonModalProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') {
        setSliderPosition((prev) => Math.max(0, prev - 5));
      }
      if (e.key === 'ArrowRight') {
        setSliderPosition((prev) => Math.min(100, prev + 5));
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(x, rect.width));
    const percent = (clampedX / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMove]);

  if (!isOpen || !result) return null;

  const compressedSrc = result.previewDataUrl || result.downloadUrl;
  const originalSrc = originalPreviewUrl || compressedSrc;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="comparison-title"
                className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"
              >
                Before & After Comparison
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  {result.originalFileName}
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Inspect visual fidelity and verify actual compression reduction.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('slider')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'slider'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5" /> Split Slider
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('side-by-side')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'side-by-side'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5" /> Side-by-Side
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Visual Comparison Area */}
          {viewMode === 'slider' ? (
            <div className="space-y-2">
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onTouchMove={handleTouchMove}
                className="relative w-full h-72 sm:h-96 rounded-xl bg-zinc-950/90 overflow-hidden cursor-ew-resize select-none border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"
              >
                {/* Background Layer: Original Image */}
                <div className="absolute inset-0 flex items-center justify-center p-2">
                  <img
                    src={originalSrc}
                    alt="Original"
                    className="max-w-full max-h-full object-contain pointer-events-none"
                  />
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[11px] font-mono text-white/90">
                    Original ({result.originalSizeFormatted})
                  </div>
                </div>

                {/* Foreground Layer: Compressed Image clipped by slider */}
                <div
                  className="absolute inset-0 flex items-center justify-center p-2 overflow-hidden pointer-events-none"
                  style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
                >
                  <img
                    src={compressedSrc}
                    alt="Compressed"
                    className="max-w-full max-h-full object-contain pointer-events-none"
                  />
                  <div className="absolute top-3 right-3 px-2 py-1 rounded bg-emerald-600/80 backdrop-blur-sm text-[11px] font-mono text-white">
                    Compressed ({result.compressedSizeFormatted})
                  </div>
                </div>

                {/* Draggable Divider Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border-2 border-emerald-500 shadow-md flex items-center justify-center text-zinc-700 dark:text-zinc-200">
                    <Columns className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
                <span>◀ Original</span>
                <span className="font-mono text-[11px]">
                  Drag slider to inspect details • {sliderPosition.toFixed(0)}%
                </span>
                <span>Compressed ▶</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <span>Original Image</span>
                  <span className="font-mono text-zinc-500">{result.originalSizeFormatted}</span>
                </div>
                <div className="h-64 sm:h-80 rounded-xl bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800 p-2 flex items-center justify-center overflow-hidden">
                  <img
                    src={originalSrc}
                    alt="Original"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span>Compressed Output</span>
                  <span className="font-mono">{result.compressedSizeFormatted}</span>
                </div>
                <div className="h-64 sm:h-80 rounded-xl bg-zinc-950/90 border border-emerald-500/30 p-2 flex items-center justify-center overflow-hidden">
                  <img
                    src={compressedSrc}
                    alt="Compressed"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Original Size</span>
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                {result.originalSizeFormatted}
              </p>
              <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                {result.originalDimensions.width} × {result.originalDimensions.height} px
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Compressed Size</span>
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                {result.compressedSizeFormatted}
              </p>
              <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                {result.compressedDimensions.width} × {result.compressedDimensions.height} px
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border space-y-1 ${
                result.isLarger
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <span className="text-[11px]">
                {result.isLarger ? 'Size Change' : 'Reduction'}
              </span>
              <p className="text-base font-bold font-mono">
                {result.isLarger
                  ? `+${Math.abs(result.sizeReductionPercent)}%`
                  : `-${result.sizeReductionPercent}%`}
              </p>
              <span className="text-[10px]">
                {result.isLarger
                  ? `Increased by ${(Math.abs(result.sizeDifferenceBytes) / 1024).toFixed(1)} KB`
                  : `Saved ${(result.sizeDifferenceBytes / 1024).toFixed(1)} KB`}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Applied Settings</span>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>{result.appliedFormat}</span>
                <span className="text-xs font-mono font-normal text-zinc-500">
                  Q{result.appliedQuality}
                </span>
              </p>
              <span className="text-[10px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                {result.metadataStripped ? 'Metadata Stripped' : 'Metadata Preserved'}
              </span>
            </div>
          </div>

          {/* Notices & Alerts */}
          {result.targetSizeNotice && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-semibold">Target Size Notice: </span>
                {result.targetSizeNotice}
              </div>
            </div>
          )}

          {result.targetSizeRequested && result.targetSizeAchieved && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>
                Successfully met your target file size budget of{' '}
                <strong className="font-mono">
                  {(result.targetSizeRequested / 1024).toFixed(0)} KB
                </strong>{' '}
                using adaptive quality search (Q{result.appliedQuality}).
              </span>
            </div>
          )}

          {result.transparencyHandled && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
              <div>
                <span className="font-semibold">Transparency Handling: </span>
                {result.transparencyHandled}
              </div>
            </div>
          )}

          {/* Detailed Transformation Summary Table */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              Technical Details & Transformations
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">Output Filename:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 font-medium truncate max-w-[200px]" title={result.compressedFileName}>
                  {result.compressedFileName}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">Dimensions:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span>{result.originalDimensions.width}×{result.originalDimensions.height}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                  <span>{result.compressedDimensions.width}×{result.compressedDimensions.height}</span>
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">Format:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 uppercase">
                  <span>{result.originalFileName.split('.').pop()}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                  <span>{result.appliedFormat}</span>
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">EXIF / GPS Privacy:</span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {result.metadataStripped ? '100% Stripped & Scrubbed' : 'Preserved'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 shrink-0">
          <span className="text-xs text-zinc-500 font-mono">
            Expires in 15 min • Zero Retention
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Close
            </button>
            <a
              href={result.downloadUrl}
              download={result.compressedFileName}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Compressed Image
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
