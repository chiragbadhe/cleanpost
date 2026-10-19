'use client';

import React from 'react';
import { X, Sliders, Shield, RefreshCw, Zap } from 'lucide-react';
import { CleaningOptions } from '@/types/metadata';

interface CleaningOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: CleaningOptions;
  onOptionsChange: (newOptions: CleaningOptions) => void;
}

export function CleaningOptionsModal({
  isOpen,
  onClose,
  options,
  onOptionsChange,
}: CleaningOptionsModalProps) {
  if (!isOpen) return null;

  const toggleOption = (key: keyof CleaningOptions) => {
    onOptionsChange({
      ...options,
      [key]: !options[key],
    });
  };

  const setCleanAll = () => {
    onOptionsChange({
      removeExif: true,
      removeGps: true,
      removeTimestamps: true,
      removeSoftware: true,
      removeXmpIptc: true,
      removeThumbnails: true,
      stripC2pa: true,
      stripAiPrompts: true,
      reencode: false,
      targetFormat: 'original',
      quality: 90,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Metadata Cleaning Preferences
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose which categories of information to strip or retain
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick preset banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                Recommended: Strip all privacy-invasive metadata
              </span>
            </div>
            <button
              type="button"
              onClick={setCleanAll}
              className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 font-semibold shadow-xs flex items-center gap-1 shrink-0"
            >
              <Zap className="w-3 h-3" />
              Clean All
            </button>
          </div>

          {/* Toggle Switches */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Metadata Stripping Flags
            </h4>

            {/* GPS & Location */}
            <label className="flex items-start justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="pr-4">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  GPS & Location Coordinates
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Remove latitude, longitude, altitude, and position stamps that expose where the photo/video was taken.
                </div>
              </div>
              <input
                type="checkbox"
                checked={options.removeGps}
                onChange={() => toggleOption('removeGps')}
                className="mt-1 w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
              />
            </label>

            {/* EXIF Details */}
            <label className="flex items-start justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="pr-4">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Camera & Device Information (EXIF)
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Strip camera make/model, lens specifications, hardware serial numbers, and ISO/shutter parameters.
                </div>
              </div>
              <input
                type="checkbox"
                checked={options.removeExif}
                onChange={() => toggleOption('removeExif')}
                className="mt-1 w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
              />
            </label>

            {/* Timestamps */}
            <label className="flex items-start justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="pr-4">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Timestamps & Date Created
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Remove original capture date, digitization time, and timezone offset records.
                </div>
              </div>
              <input
                type="checkbox"
                checked={options.removeTimestamps}
                onChange={() => toggleOption('removeTimestamps')}
                className="mt-1 w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
              />
            </label>

            {/* Editing Software */}
            <label className="flex items-start justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="pr-4">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Editing Software & Creator Tools
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Erase application signatures (e.g. Photoshop, Lightroom, Final Cut, CapCut, Premiere).
                </div>
              </div>
              <input
                type="checkbox"
                checked={options.removeSoftware}
                onChange={() => toggleOption('removeSoftware')}
                className="mt-1 w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
              />
            </label>

            {/* XMP & IPTC */}
            <label className="flex items-start justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="pr-4">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  XMP & IPTC Metadata Tags
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Wipe author names, copyright notices, custom tags, and editor history records.
                </div>
              </div>
              <input
                type="checkbox"
                checked={options.removeXmpIptc}
                onChange={() => toggleOption('removeXmpIptc')}
                className="mt-1 w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
              />
            </label>

            {/* AI Prompts & C2PA */}
            <label className="flex items-start justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="pr-4">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  AI Generation Prompts & C2PA Manifests
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    AI Scrub
                  </span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Strip embedded generation prompts (Stable Diffusion, Midjourney) and C2PA Content Credentials JUMBF manifest boxes.
                </div>
              </div>
              <input
                type="checkbox"
                checked={options.stripAiPrompts}
                onChange={() => {
                  toggleOption('stripAiPrompts');
                  toggleOption('stripC2pa');
                }}
                className="mt-1 w-4 h-4 text-purple-600 rounded border-zinc-300 focus:ring-purple-500"
              />
            </label>

            {/* Embedded Thumbnails */}
            <label className="flex items-start justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="pr-4">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Strip Embedded Thumbnails
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Remove pre-rendered mini thumbnails that could accidentally expose uncropped or private imagery.
                </div>
              </div>
              <input
                type="checkbox"
                checked={options.removeThumbnails}
                onChange={() => toggleOption('removeThumbnails')}
                className="mt-1 w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
              />
            </label>
          </div>

          {/* Re-encoding & Quality Options */}
          <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Re-Encoding & Output Quality
            </h4>

            <label className="flex items-start justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer">
              <div className="pr-4">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Deep Video Re-encoding (Bitstream Scrub)
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Re-encode video frames with H.264/AAC to eliminate stream-level SEI userdata and hidden tags. Takes slightly longer than stream-copy.
                </div>
              </div>
              <input
                type="checkbox"
                checked={options.reencode}
                onChange={() => toggleOption('reencode')}
                className="mt-1 w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
              />
            </label>

            {/* Target format */}
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-900 dark:text-zinc-100">
                <span>Output Format</span>
                <span className="text-zinc-500 font-mono text-[11px] uppercase">{options.targetFormat}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {(['original', 'jpeg', 'png', 'webp'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => onOptionsChange({ ...options, targetFormat: fmt })}
                    className={`py-1.5 px-2 rounded-lg font-medium border text-center transition-all ${
                      options.targetFormat === fmt
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Slider */}
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-900 dark:text-zinc-100">
                <span>Visual Quality Preserving</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{options.quality}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                step="5"
                value={options.quality}
                onChange={(e) => onOptionsChange({ ...options, quality: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>Smaller size (60%)</span>
                <span>Balanced (90%)</span>
                <span>Near Lossless (100%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm transition-all"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
