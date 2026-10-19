'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Maximize2,
  FileArchive,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
  HelpCircle,
} from 'lucide-react';
import { CompressionOptions, CompressionPreset, OutputFormat } from '@/types/compression';

interface CompressionSettingsProps {
  options: CompressionOptions;
  onOptionsChange: (newOptions: CompressionOptions) => void;
  disabled?: boolean;
}

export function CompressionSettings({
  options,
  onOptionsChange,
  disabled = false,
}: CompressionSettingsProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [targetSizeUnit, setTargetSizeUnit] = useState<'KB' | 'MB'>('KB');
  const [targetSizeValue, setTargetSizeValue] = useState<string>(() => {
    if (!options.targetSizeBytes) return '';
    return options.targetSizeBytes >= 1024 * 1024
      ? (options.targetSizeBytes / (1024 * 1024)).toString()
      : Math.round(options.targetSizeBytes / 1024).toString();
  });
  const [hasTargetSize, setHasTargetSize] = useState<boolean>(Boolean(options.targetSizeBytes));

  const handlePresetSelect = (preset: CompressionPreset) => {
    let quality = options.quality;
    if (preset === 'low_size') quality = 55;
    else if (preset === 'balanced') quality = 80;
    else if (preset === 'high_quality') quality = 92;

    onOptionsChange({
      ...options,
      preset,
      quality,
    });
  };

  const handleQualityChange = (q: number) => {
    let preset: CompressionPreset = 'custom';
    if (q === 55) preset = 'low_size';
    else if (q === 80) preset = 'balanced';
    else if (q === 92) preset = 'high_quality';

    onOptionsChange({
      ...options,
      quality: q,
      preset,
    });
  };

  const handleFormatChange = (fmt: OutputFormat) => {
    onOptionsChange({
      ...options,
      targetFormat: fmt,
    });
  };

  const handleTargetSizeToggle = (enabled: boolean) => {
    setHasTargetSize(enabled);
    if (!enabled) {
      const next = { ...options };
      delete next.targetSizeBytes;
      onOptionsChange(next);
    } else {
      const num = parseFloat(targetSizeValue);
      if (!isNaN(num) && num > 0) {
        const bytes = targetSizeUnit === 'MB' ? Math.round(num * 1024 * 1024) : Math.round(num * 1024);
        onOptionsChange({ ...options, targetSizeBytes: bytes });
      }
    }
  };

  const handleTargetSizeNumberChange = (valStr: string) => {
    setTargetSizeValue(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0 && hasTargetSize) {
      const bytes = targetSizeUnit === 'MB' ? Math.round(num * 1024 * 1024) : Math.round(num * 1024);
      onOptionsChange({ ...options, targetSizeBytes: bytes });
    } else if (valStr === '' && hasTargetSize) {
      const next = { ...options };
      delete next.targetSizeBytes;
      onOptionsChange(next);
    }
  };

  const handleTargetSizeUnitChange = (unit: 'KB' | 'MB') => {
    setTargetSizeUnit(unit);
    const num = parseFloat(targetSizeValue);
    if (!isNaN(num) && num > 0 && hasTargetSize) {
      const bytes = unit === 'MB' ? Math.round(num * 1024 * 1024) : Math.round(num * 1024);
      onOptionsChange({ ...options, targetSizeBytes: bytes });
    }
  };

  // Helper text explaining quality level
  const getQualityDescription = (q: number) => {
    if (q <= 60) {
      return 'Maximum file size reduction with visible compression artifacts. Recommended for mobile thumbnails and fast web transfer.';
    }
    if (q <= 84) {
      return 'Optimal balance between substantial file size savings and high visual quality with minimal noticeable loss.';
    }
    return 'Visually lossless quality. Retains subtle details and sharp edges while removing redundant data.';
  };

  return (
    <div className="w-full bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Compression Settings
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Configure output quality, formats, dimensions, and privacy options.
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl text-xs">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handlePresetSelect('low_size')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              options.preset === 'low_size'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Low Size
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handlePresetSelect('balanced')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              options.preset === 'balanced'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Balanced
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handlePresetSelect('high_quality')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              options.preset === 'high_quality'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            High Quality
          </button>
        </div>
      </div>

      {/* Primary Row: Quality Slider & Output Format */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="quality-slider"
              className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"
            >
              Compression Quality
              <span className="text-[11px] font-normal text-zinc-500">
                (1 - 100)
              </span>
            </label>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20">
                {options.quality}%
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <input
              id="quality-slider"
              type="range"
              min="1"
              max="100"
              value={options.quality}
              disabled={disabled}
              onChange={(e) => handleQualityChange(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>Smaller Size (1)</span>
              <span>Balanced (80)</span>
              <span>Best Quality (100)</span>
            </div>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
            {getQualityDescription(options.quality)}
          </p>
        </div>

        {/* Output Format */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            Output Format
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'original', label: 'Original', desc: 'Preserve format' },
              { id: 'webp', label: 'WebP', desc: 'Recommended' },
              { id: 'jpeg', label: 'JPEG', desc: 'Universal' },
              { id: 'png', label: 'PNG', desc: 'Lossless' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                disabled={disabled}
                onClick={() => handleFormatChange(fmt.id as OutputFormat)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  options.targetFormat === fmt.id
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/30'
                }`}
              >
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                  {fmt.label}
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  {fmt.desc}
                </div>
              </button>
            ))}
          </div>

          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
            {options.targetFormat === 'webp' && (
              <p className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                WebP provides superior compression efficiency and full transparency support.
              </p>
            )}
            {options.targetFormat === 'jpeg' && (
              <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 shrink-0" />
                JPEG does not support transparency. Transparent areas will be automatically flattened onto a clean white background.
              </p>
            )}
            {options.targetFormat === 'png' && (
              <p className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 shrink-0" />
                PNG preserves lossless pixel fidelity. Converting photographic JPEGs to PNG may increase overall file size.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Cleaning & Privacy Integration */}
      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              Strip Metadata (Privacy Protection)
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                CleanPost Engine
              </span>
            </span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Scrub EXIF, GPS location coordinates, camera models, and AI tags during compression.
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={options.stripMetadata}
            disabled={disabled}
            onChange={(e) => onOptionsChange({ ...options, stripMetadata: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </div>

      {/* Collapsible Advanced: Resizing & Target Size */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full flex items-center justify-between py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <span className="flex items-center gap-1.5 font-semibold">
            <Maximize2 className="w-3.5 h-3.5 text-zinc-500" />
            Image Resizing & Target File Size Budget
          </span>
          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
            {isAdvancedOpen ? 'Hide advanced' : 'Show advanced'}
            {isAdvancedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {isAdvancedOpen && (
          <div className="pt-4 space-y-5 animate-in fade-in duration-200">
            {/* Resizing controls */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Resize Dimensions (Optional)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="max-width-input" className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Max Width (px)
                  </label>
                  <input
                    id="max-width-input"
                    type="number"
                    min="1"
                    max="10000"
                    placeholder="e.g. 1920"
                    disabled={disabled}
                    value={options.maxWidth || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      const next = { ...options };
                      if (isNaN(val) || val <= 0) delete next.maxWidth;
                      else next.maxWidth = val;
                      onOptionsChange(next);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="max-height-input" className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Max Height (px)
                  </label>
                  <input
                    id="max-height-input"
                    type="number"
                    min="1"
                    max="10000"
                    placeholder="e.g. 1080"
                    disabled={disabled}
                    value={options.maxHeight || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      const next = { ...options };
                      if (isNaN(val) || val <= 0) delete next.maxHeight;
                      else next.maxHeight = val;
                      onOptionsChange(next);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.preserveAspectRatio}
                    disabled={disabled}
                    onChange={(e) =>
                      onOptionsChange({ ...options, preserveAspectRatio: e.target.checked })
                    }
                    className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Preserve Aspect Ratio (Never distort image)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.allowUpscaling}
                    disabled={disabled}
                    onChange={(e) =>
                      onOptionsChange({ ...options, allowUpscaling: e.target.checked })
                    }
                    className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Allow upscaling smaller images</span>
                </label>
              </div>
            </div>

            {/* Target File Size Budget */}
            <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileArchive className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Target File Size Limit (Adaptive Quality)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasTargetSize}
                    disabled={disabled}
                    onChange={(e) => handleTargetSizeToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {hasTargetSize && (
                <div className="space-y-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 500"
                      disabled={disabled}
                      value={targetSizeValue}
                      onChange={(e) => handleTargetSizeNumberChange(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="flex items-center p-0.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-xs">
                      <button
                        type="button"
                        onClick={() => handleTargetSizeUnitChange('KB')}
                        className={`px-2 py-1 rounded-md font-mono font-medium ${
                          targetSizeUnit === 'KB'
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        KB
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTargetSizeUnitChange('MB')}
                        className={`px-2 py-1 rounded-md font-mono font-medium ${
                          targetSizeUnit === 'MB'
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        MB
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-start gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-400" />
                    <span>
                      CleanPost will iteratively tune quality to achieve your target size without degrading fidelity more than necessary. If the target cannot be reached, you will be notified with the best possible reduction.
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
