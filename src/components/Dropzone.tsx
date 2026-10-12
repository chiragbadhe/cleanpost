'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileImage, Film, Shield, AlertCircle } from 'lucide-react';
import { MAX_FILE_SIZE_BYTES } from '@/lib/constants';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function Dropzone({ onFilesSelected, disabled = false }: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const validateAndProcessFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`${file.name} is too large (> 150MB).`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length > 0) {
      setErrorMessage(errors.join(' '));
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;
    validateAndProcessFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    validateAndProcessFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 select-none ${
          disabled
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
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto">
          {/* Central Icon */}
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
              Drag & drop photos or videos here
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              or <span className="text-emerald-700 dark:text-emerald-400 underline font-medium">browse files</span> from your computer or phone
            </p>
          </div>

          {/* Supported Format Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50">
              <FileImage className="w-3.5 h-3.5 text-emerald-500" />
              JPG, PNG, WebP, HEIC
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50">
              <Film className="w-3.5 h-3.5 text-cyan-500" />
              MP4, MOV, WebM
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              Up to 150MB / file
            </span>
          </div>

          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
            Files are processed ephemerally • 100% Zero Retention
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
