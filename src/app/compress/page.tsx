import type { Metadata } from 'next';
import { ImageCompressorView } from '@/components/ImageCompressorView';
import { Sliders } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Smart Image Compressor — CleanPost',
  description:
    'Compress JPEG, PNG, WebP, and HEIC images with adaptive quality control, intelligent format conversion, dimensions resizing, and zero-retention metadata stripping.',
};

export default function CompressPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Image Compression
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Sharp Pipeline
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Reduce image file sizes, convert formats, and strip tracking metadata without sacrificing visual fidelity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="px-3.5 py-2 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-500" />
            Metadata Cleaner
          </Link>
        </div>
      </div>

      {/* Main Compressor Component */}
      <ImageCompressorView />
    </div>
  );
}
